create or replace function public.get_purchase_stock_history(
  p_from_date date,
  p_to_date date
)
returns table (
  date date,
  total_amount numeric,
  item_count integer,
  total_required_qty numeric,
  total_purchased_qty numeric,
  total_variance_qty numeric
)
language sql
as $$
  select
    p.purchase_date as date,
    round(sum(coalesce(p.line_total, 0)), 2) as total_amount,
    count(*)::int as item_count,
    round(sum(coalesce(p.final_qty, 0)), 2) as total_required_qty,
    round(sum(coalesce(p.purchased_qty, 0)), 2) as total_purchased_qty,
    round(sum(coalesce(p.variance_qty, 0)), 2) as total_variance_qty
  from public.purchase_plans p
  where p.purchase_status = 'finalized'
    and p.purchase_date between p_from_date and p_to_date
  group by p.purchase_date
  order by p.purchase_date desc;
$$;

create or replace function public.get_purchase_stock_details(
  p_purchase_date date
)
returns table (
  purchase_date date,
  item_en text,
  item_hi text,
  item_code text,
  final_qty numeric,
  purchased_qty numeric,
  unit_price numeric,
  line_total numeric,
  variance_qty numeric,
  vendor_name text,
  purchase_status text
)
language sql
as $$
  select
    p.purchase_date,
    p.item_en,
    p.item_hi,
    p.item_code,
    round(coalesce(p.final_qty, 0), 2) as final_qty,
    round(coalesce(p.purchased_qty, 0), 2) as purchased_qty,
    round(coalesce(p.unit_price, 0), 2) as unit_price,
    round(coalesce(p.line_total, 0), 2) as line_total,
    round(coalesce(p.variance_qty, 0), 2) as variance_qty,
    p.vendor_name,
    p.purchase_status
  from public.purchase_plans p
  where p.purchase_status = 'finalized'
    and p.purchase_date = p_purchase_date
  order by p.item_en asc;
$$;
