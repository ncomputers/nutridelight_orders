create or replace function public.create_invoice_from_order(p_order_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_order public.orders%rowtype;
  v_invoice_id uuid;
  v_invoice_no text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_other numeric := 0;
  v_grand numeric := 0;
  v_due numeric := 0;
  v_payment_status text := 'unpaid';
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found: %', p_order_id;
  end if;

  if coalesce(v_order.restaurant_id, '') = '' then
    raise exception 'Order has no restaurant_id: %', p_order_id;
  end if;

  select id
  into v_invoice_id
  from public.sales_invoices
  where order_id = p_order_id
  limit 1;

  if found then
    return v_invoice_id;
  end if;

  loop
    v_invoice_no := 'INV-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.sales_invoices where invoice_no = v_invoice_no);
  end loop;

  insert into public.sales_invoices (
    invoice_no,
    order_id,
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
  )
  values (
    v_invoice_no,
    p_order_id,
    v_order.restaurant_id,
    coalesce(v_order.restaurant_name, ''),
    coalesce(v_order.restaurant_slug, ''),
    current_date,
    coalesce(v_order.delivery_date, current_date),
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

  if jsonb_typeof(coalesce(v_order.items::jsonb, '[]'::jsonb)) = 'array' then
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
    select
      v_invoice_id,
      nullif(trim(coalesce(item->>'code', '')), ''),
      coalesce(nullif(trim(coalesce(item->>'en', '')), ''), 'Unknown Item'),
      nullif(trim(coalesce(item->>'hi', '')), ''),
      greatest(0, coalesce((item->>'qty')::numeric, 0)),
      'kg',
      greatest(0, coalesce((item->>'unit_price')::numeric, 0)),
      round(greatest(0, coalesce((item->>'qty')::numeric, 0)) * greatest(0, coalesce((item->>'unit_price')::numeric, 0)), 2),
      null,
      now()
    from jsonb_array_elements(coalesce(v_order.items::jsonb, '[]'::jsonb)) as item;
  end if;

  select coalesce(round(sum(line_total), 2), 0)
  into v_subtotal
  from public.sales_invoice_lines
  where invoice_id = v_invoice_id;

  v_grand := round(greatest(0, v_subtotal - v_discount + v_other), 2);
  v_due := v_grand;
  if v_due = 0 then
    v_payment_status := 'paid';
  else
    v_payment_status := 'unpaid';
  end if;

  update public.sales_invoices
  set
    subtotal = v_subtotal,
    discount_amount = v_discount,
    other_charges = v_other,
    grand_total = v_grand,
    due_amount = v_due,
    payment_status = v_payment_status,
    updated_at = now()
  where id = v_invoice_id;

  return v_invoice_id;
end;
$$;

create or replace function public.finalize_purchase(p_purchase_day_id uuid)
returns date
language plpgsql
as $$
declare
  v_day public.purchase_day_locks%rowtype;
begin
  select *
  into v_day
  from public.purchase_day_locks
  where id = p_purchase_day_id
  for update;

  if not found then
    raise exception 'Purchase day lock not found: %', p_purchase_day_id;
  end if;

  if v_day.is_locked then
    return v_day.purchase_date;
  end if;

  with old_rows as (
    select
      p.id,
      coalesce(p.item_code, p.item_en) as item_key,
      p.item_code,
      p.item_en,
      greatest(0, coalesce(p.variance_qty, 0)) as old_positive
    from public.purchase_plans p
    where p.purchase_date = v_day.purchase_date
    for update
  ),
  updated_rows as (
    update public.purchase_plans p
    set
      final_qty = round(coalesce(p.ordered_qty, 0) + coalesce(p.adjustment_qty, 0), 2),
      purchased_qty = round(
        case
          when coalesce(p.pack_size, 0) > 0 and coalesce(p.pack_count, 0) > 0
            then coalesce(p.pack_size, 0) * coalesce(p.pack_count, 0)
          else greatest(0, coalesce(p.purchased_qty, 0))
        end,
        2
      ),
      variance_qty = round(
        round(
          case
            when coalesce(p.pack_size, 0) > 0 and coalesce(p.pack_count, 0) > 0
              then coalesce(p.pack_size, 0) * coalesce(p.pack_count, 0)
            else greatest(0, coalesce(p.purchased_qty, 0))
          end,
          2
        ) - round(coalesce(p.ordered_qty, 0) + coalesce(p.adjustment_qty, 0), 2),
        2
      ),
      line_total = round(
        round(
          case
            when coalesce(p.pack_size, 0) > 0 and coalesce(p.pack_count, 0) > 0
              then coalesce(p.pack_size, 0) * coalesce(p.pack_count, 0)
            else greatest(0, coalesce(p.purchased_qty, 0))
          end,
          2
        ) * greatest(0, coalesce(p.unit_price, 0)),
        2
      ),
      purchase_status = 'finalized',
      finalized_at = now(),
      finalized_by = 'system',
      updated_at = now()
    where p.purchase_date = v_day.purchase_date
    returning
      p.id,
      coalesce(p.item_code, p.item_en) as item_key,
      p.item_code,
      p.item_en,
      greatest(0, coalesce(p.variance_qty, 0)) as new_positive
  ),
  stock_deltas as (
    select
      u.item_key,
      u.item_code,
      u.item_en,
      round(greatest(0, u.new_positive - coalesce(o.old_positive, 0)), 2) as delta
    from updated_rows u
    left join old_rows o on o.id = u.id
  )
  insert into public.stock_qty (item_code, item_en, available_qty, updated_at)
  select
    coalesce(sd.item_code, sd.item_key),
    sd.item_en,
    sd.delta,
    now()
  from stock_deltas sd
  where sd.delta > 0
  on conflict (item_code) do update
  set
    item_en = excluded.item_en,
    available_qty = round(coalesce(public.stock_qty.available_qty, 0) + excluded.available_qty, 2),
    updated_at = now();

  update public.purchase_day_locks
  set
    is_locked = true,
    locked_at = now(),
    reopened_at = null,
    updated_at = now()
  where id = p_purchase_day_id;

  return v_day.purchase_date;
end;
$$;
