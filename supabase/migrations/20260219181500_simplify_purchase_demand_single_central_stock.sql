create or replace function public.get_purchase_demand(
  p_purchase_date date,
  p_need_mode text default null
)
returns table (
  item_code text,
  item_en text,
  restaurant_qty numeric,
  local_policy_qty numeric,
  carry_forward_qty numeric,
  gross_required_qty numeric,
  main_available_qty numeric,
  required_qty numeric,
  need_mode text
)
language plpgsql
as $$
declare
  v_mode text := 'net';
begin
  select coalesce(p_need_mode, s.need_mode, 'net')
  into v_mode
  from public.purchase_day_settings s
  where s.purchase_date = p_purchase_date;

  if v_mode not in ('net', 'gross') then
    v_mode := 'net';
  end if;

  return query
  with restaurant_demand as (
    select
      coalesce(nullif(trim(coalesce(item->>'code', '')), ''), nullif(trim(coalesce(item->>'en', '')), ''), 'UNKNOWN') as item_code,
      coalesce(nullif(trim(coalesce(item->>'en', '')), ''), coalesce(item->>'code', 'UNKNOWN')) as item_en,
      round(sum(greatest(0, coalesce((item->>'qty')::numeric, 0))), 2) as qty
    from public.orders o
    cross join lateral jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
    where o.status = 'confirmed'
      and o.delivery_date = p_purchase_date
    group by 1, 2
  ),
  central_stock as (
    select
      s.item_code,
      round(coalesce(s.available_qty, 0), 2) as qty
    from public.stock_qty s
  ),
  local_gap as (
    select
      p.item_code,
      p.item_en,
      round(greatest(0, coalesce(p.target_qty, 0) - coalesce(cs.qty, 0)), 2) as qty
    from public.local_store_inventory_policy p
    left join central_stock cs on cs.item_code = p.item_code
    where p.is_active = true
  ),
  carry as (
    select
      c.item_code,
      c.item_en,
      round(sum(c.qty_remaining), 2) as qty
    from public.purchase_carry_forwards c
    where c.carry_date = p_purchase_date
    group by 1, 2
  ),
  merged as (
    select
      k.item_code,
      min(k.item_en) as item_en,
      round(sum(k.restaurant_qty), 2) as restaurant_qty,
      round(sum(k.local_policy_qty), 2) as local_policy_qty,
      round(sum(k.carry_qty), 2) as carry_qty
    from (
      select r.item_code, r.item_en, r.qty as restaurant_qty, 0::numeric as local_policy_qty, 0::numeric as carry_qty from restaurant_demand r
      union all
      select l.item_code, l.item_en, 0::numeric, l.qty, 0::numeric from local_gap l
      union all
      select c.item_code, c.item_en, 0::numeric, 0::numeric, c.qty from carry c
    ) k
    group by k.item_code
  )
  select
    m.item_code,
    m.item_en,
    m.restaurant_qty,
    m.local_policy_qty,
    m.carry_qty,
    round(m.restaurant_qty + m.local_policy_qty + m.carry_qty, 2) as gross_required_qty,
    round(coalesce(cs.qty, 0), 2) as main_available_qty,
    round(
      case
        when v_mode = 'net' then greatest(0, (m.restaurant_qty + m.local_policy_qty + m.carry_qty) - coalesce(cs.qty, 0))
        else (m.restaurant_qty + m.local_policy_qty + m.carry_qty)
      end,
      2
    ) as required_qty,
    v_mode as need_mode
  from merged m
  left join central_stock cs on cs.item_code = m.item_code
  order by m.item_en asc;
end;
$$;
