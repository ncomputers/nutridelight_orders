-- Simplify purchase demand generation:
-- 1) Single warehouse policy field: required_stock_qty
-- 2) Rolling queue from confirmed orders (no delivery-date lock)
-- 3) No carry-forward and no net/gross mode branching

alter table public.local_store_inventory_policy
  add column if not exists required_stock_qty numeric not null default 0;

update public.local_store_inventory_policy
set required_stock_qty = round(
  greatest(
    0,
    coalesce(required_stock_qty, min_qty, target_qty, 0)
  ),
  2
)
where true;

create or replace function public.get_purchase_demand(
  p_purchase_date date,
  p_need_mode text default null
)
returns table (
  item_code text,
  item_en text,
  restaurant_confirmed_qty numeric,
  required_stock_qty numeric,
  current_stock_qty numeric,
  warehouse_gap_qty numeric,
  raw_required_qty numeric,
  purchase_required_qty numeric
)
language plpgsql
as $$
begin
  return query
  with restaurant_demand as (
    select
      coalesce(
        nullif(trim(coalesce(item->>'code', '')), ''),
        nullif(trim(coalesce(item->>'en', '')), ''),
        'UNKNOWN'
      ) as item_code,
      coalesce(
        nullif(trim(coalesce(item->>'en', '')), ''),
        coalesce(item->>'code', 'UNKNOWN')
      ) as item_en,
      round(sum(greatest(0, coalesce((item->>'qty')::numeric, 0))), 2) as qty
    from public.orders o
    cross join lateral jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
    where o.status = 'confirmed'
    group by 1, 2
  ),
  policy_demand as (
    select
      p.item_code,
      p.item_en,
      round(greatest(0, coalesce(p.required_stock_qty, 0)), 2) as required_stock_qty
    from public.local_store_inventory_policy p
    where p.is_active = true
  ),
  central_stock as (
    select
      s.item_code,
      coalesce(nullif(trim(s.item_en), ''), s.item_code) as item_en,
      round(coalesce(s.available_qty, 0), 2) as qty
    from public.stock_qty s
  ),
  merged as (
    select
      x.item_code,
      min(x.item_en) as item_en,
      round(sum(x.restaurant_confirmed_qty), 2) as restaurant_confirmed_qty,
      round(sum(x.required_stock_qty), 2) as required_stock_qty
    from (
      select r.item_code, r.item_en, r.qty as restaurant_confirmed_qty, 0::numeric as required_stock_qty
      from restaurant_demand r
      union all
      select p.item_code, p.item_en, 0::numeric as restaurant_confirmed_qty, p.required_stock_qty
      from policy_demand p
    ) x
    group by x.item_code
  )
  select
    m.item_code,
    m.item_en,
    m.restaurant_confirmed_qty,
    m.required_stock_qty,
    round(coalesce(cs.qty, 0), 2) as current_stock_qty,
    round(m.required_stock_qty - coalesce(cs.qty, 0), 2) as warehouse_gap_qty,
    round(m.restaurant_confirmed_qty + (m.required_stock_qty - coalesce(cs.qty, 0)), 2) as raw_required_qty,
    round(greatest(0, m.restaurant_confirmed_qty + (m.required_stock_qty - coalesce(cs.qty, 0))), 2) as purchase_required_qty
  from merged m
  left join central_stock cs on cs.item_code = m.item_code
  order by m.item_en asc;
end;
$$;

