create or replace function public.get_purchase_items(p_purchase_date date default current_date)
returns table (
  item_code text,
  item_name text,
  required_qty numeric,
  purchased_qty numeric,
  remaining_qty numeric,
  status text
)
language sql
as $$
  select
    p.item_code,
    p.item_en as item_name,
    round(coalesce(p.final_qty, 0), 2) as required_qty,
    round(coalesce(p.purchased_qty, 0), 2) as purchased_qty,
    round(coalesce(p.final_qty, 0) - coalesce(p.purchased_qty, 0), 2) as remaining_qty,
    case
      when round(coalesce(p.final_qty, 0) - coalesce(p.purchased_qty, 0), 2) > 0 then 'pending'
      when round(coalesce(p.final_qty, 0) - coalesce(p.purchased_qty, 0), 2) = 0 then 'completed'
      else 'over'
    end as status
  from public.purchase_plans p
  where p.purchase_date = p_purchase_date
  order by
    case
      when round(coalesce(p.final_qty, 0) - coalesce(p.purchased_qty, 0), 2) > 0 then 0
      when round(coalesce(p.final_qty, 0) - coalesce(p.purchased_qty, 0), 2) < 0 then 1
      else 2
    end,
    p.item_en asc;
$$;
