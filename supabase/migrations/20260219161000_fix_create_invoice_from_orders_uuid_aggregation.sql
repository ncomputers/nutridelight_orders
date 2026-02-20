-- Fix uuid aggregation bug in create_invoice_from_orders:
-- Postgres does not support min(uuid).

create or replace function public.create_invoice_from_orders(p_order_ids uuid[])
returns uuid
language plpgsql
as $$
declare
  v_order_ids uuid[];
  v_input_count integer;
  v_found_count integer;
  v_delivered_count integer;
  v_restaurant_count integer;
  v_restaurant_id uuid;
  v_restaurant_name text;
  v_restaurant_slug text;
  v_delivery_date date;
  v_invoice_id uuid;
  v_invoice_no text;
  v_missing_order_items integer := 0;
begin
  if p_order_ids is null or array_length(p_order_ids, 1) is null then
    raise exception 'PST400_EMPTY_ORDER_IDS';
  end if;

  select array_agg(distinct id) into v_order_ids
  from unnest(p_order_ids) id;
  v_input_count := coalesce(array_length(v_order_ids, 1), 0);
  if v_input_count = 0 then
    raise exception 'PST400_EMPTY_ORDER_IDS';
  end if;

  select count(*) into v_found_count
  from public.orders
  where id = any(v_order_ids);
  if v_found_count <> v_input_count then
    raise exception 'PST404_ORDER_NOT_FOUND';
  end if;

  with d as (
    select *
    from public.orders
    where id = any(v_order_ids)
      and status = 'delivered'
  )
  select
    count(*)::int,
    count(distinct restaurant_id)::int,
    (array_agg(restaurant_id order by restaurant_id))[1],
    min(restaurant_name),
    min(restaurant_slug),
    max(delivery_date)
  into
    v_delivered_count,
    v_restaurant_count,
    v_restaurant_id,
    v_restaurant_name,
    v_restaurant_slug,
    v_delivery_date
  from d;

  if v_delivered_count <> v_input_count then
    raise exception 'PST400_ORDER_NOT_DELIVERED';
  end if;
  if v_restaurant_count <> 1 then
    raise exception 'PST400_MIXED_RESTAURANT_ORDERS';
  end if;

  if exists (select 1 from public.sales_invoice_orders sio where sio.order_id = any(v_order_ids)) then
    raise exception 'PST409_ORDER_ALREADY_INVOICED';
  end if;

  select count(*) into v_missing_order_items
  from unnest(v_order_ids) x(order_id)
  where not exists (select 1 from public.order_items oi where oi.order_id = x.order_id);
  if v_missing_order_items > 0 then
    raise exception 'PST400_ORDER_ITEMS_MISSING';
  end if;

  loop
    v_invoice_no := 'INV-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.sales_invoices where invoice_no = v_invoice_no);
  end loop;

  insert into public.sales_invoices (
    invoice_no,
    restaurant_id,
    restaurant_name,
    restaurant_slug,
    invoice_date,
    delivery_date,
    status,
    subtotal,
    discount_amount,
    other_charges,
    grand_total,
    paid_amount,
    due_amount,
    payment_status,
    notes,
    updated_at
  ) values (
    v_invoice_no,
    v_restaurant_id,
    coalesce(v_restaurant_name, ''),
    coalesce(v_restaurant_slug, ''),
    current_date,
    coalesce(v_delivery_date, current_date),
    'draft',
    0,
    0,
    0,
    0,
    0,
    0,
    'unpaid',
    null,
    now()
  )
  returning id into v_invoice_id;

  insert into public.sales_invoice_orders (invoice_id, order_id)
  select v_invoice_id, order_id
  from unnest(v_order_ids) order_id;

  insert into public.sales_invoice_lines (
    invoice_id,
    item_code,
    item_en,
    item_hi,
    qty,
    unit,
    unit_price,
    line_total,
    line_note,
    updated_at
  )
  with merged as (
    select
      oi.item_code,
      min(oi.item_en) as item_en,
      min(oi.item_hi) as item_hi,
      round(sum(greatest(0, oi.qty)), 2) as qty
    from public.order_items oi
    where oi.order_id = any(v_order_ids)
    group by oi.item_code
  )
  select
    v_invoice_id,
    m.item_code,
    m.item_en,
    m.item_hi,
    m.qty,
    'kg',
    0,
    0,
    null,
    now()
  from merged m;

  perform public.update_invoice_totals(v_invoice_id);
  return v_invoice_id;
end;
$$;

create or replace function public.create_invoice_from_order(p_order_id uuid)
returns uuid
language plpgsql
as $$
begin
  return public.create_invoice_from_orders(array[p_order_id]);
end;
$$;
