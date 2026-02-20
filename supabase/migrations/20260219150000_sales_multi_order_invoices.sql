-- Multi-order linkage
create table if not exists public.sales_invoice_orders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (invoice_id, order_id)
);

create index if not exists idx_sales_invoice_orders_invoice_id on public.sales_invoice_orders(invoice_id);
create index if not exists idx_sales_invoice_orders_order_id on public.sales_invoice_orders(order_id);

alter table public.sales_invoice_orders enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sales_invoice_orders' and policyname = 'public read sales invoice orders'
  ) then
    create policy "public read sales invoice orders" on public.sales_invoice_orders for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sales_invoice_orders' and policyname = 'public insert sales invoice orders'
  ) then
    create policy "public insert sales invoice orders" on public.sales_invoice_orders for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sales_invoice_orders' and policyname = 'public update sales invoice orders'
  ) then
    create policy "public update sales invoice orders" on public.sales_invoice_orders for update using (true);
  end if;
end $$;

-- Payments table
create table if not exists public.sales_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  amount numeric not null check (amount > 0),
  payment_date date not null default current_date,
  method text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_payments_invoice_id on public.sales_payments(invoice_id);
create index if not exists idx_sales_payments_payment_date on public.sales_payments(payment_date);

alter table public.sales_payments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sales_payments' and policyname = 'public read sales payments'
  ) then
    create policy "public read sales payments" on public.sales_payments for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sales_payments' and policyname = 'public insert sales payments'
  ) then
    create policy "public insert sales payments" on public.sales_payments for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sales_payments' and policyname = 'public update sales payments'
  ) then
    create policy "public update sales payments" on public.sales_payments for update using (true);
  end if;
end $$;

-- Backfill linkage from old single-order design
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'sales_invoices' and column_name = 'order_id'
  ) then
    insert into public.sales_invoice_orders (invoice_id, order_id)
    select id, order_id
    from public.sales_invoices
    where order_id is not null
    on conflict (invoice_id, order_id) do nothing;
  end if;
end $$;

-- Replace old single-order RPC (drops dependency on order_id before dropping column)
drop function if exists public.create_invoice_from_order(uuid);

-- Remove old order_id coupling from sales_invoices
alter table public.sales_invoices drop constraint if exists sales_invoices_order_id_key;
drop index if exists idx_sales_invoices_order_id;
alter table public.sales_invoices drop constraint if exists sales_invoices_order_id_fkey;
alter table public.sales_invoices drop column if exists order_id;

-- Recalculate totals from DB (authoritative)
create or replace function public.update_invoice_totals(p_invoice_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_other numeric := 0;
  v_grand numeric := 0;
  v_paid numeric := 0;
  v_due numeric := 0;
  v_status text := 'unpaid';
begin
  perform 1 from public.sales_invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'PST404_INVOICE_NOT_FOUND: %', p_invoice_id;
  end if;

  update public.sales_invoice_lines
  set
    qty = round(greatest(0, coalesce(qty, 0)), 2),
    unit_price = round(greatest(0, coalesce(unit_price, 0)), 2),
    line_total = round(greatest(0, coalesce(qty, 0)) * greatest(0, coalesce(unit_price, 0)), 2),
    updated_at = now()
  where invoice_id = p_invoice_id;

  select coalesce(round(sum(line_total), 2), 0)
  into v_subtotal
  from public.sales_invoice_lines
  where invoice_id = p_invoice_id;

  select
    greatest(0, coalesce(discount_amount, 0)),
    greatest(0, coalesce(other_charges, 0))
  into v_discount, v_other
  from public.sales_invoices
  where id = p_invoice_id;

  select coalesce(round(sum(amount), 2), 0)
  into v_paid
  from public.sales_payments
  where invoice_id = p_invoice_id;

  v_grand := round(greatest(0, v_subtotal - v_discount + v_other), 2);
  v_due := round(greatest(0, v_grand - v_paid), 2);
  v_status := case when v_due <= 0 then 'paid' when v_paid > 0 then 'partial' else 'unpaid' end;

  update public.sales_invoices
  set
    subtotal = v_subtotal,
    grand_total = v_grand,
    paid_amount = v_paid,
    due_amount = v_due,
    payment_status = v_status,
    updated_at = now()
  where id = p_invoice_id;

  return jsonb_build_object(
    'invoice_id', p_invoice_id,
    'subtotal', v_subtotal,
    'grand_total', v_grand,
    'paid_amount', v_paid,
    'due_amount', v_due,
    'payment_status', v_status
  );
end;
$$;

-- Create multi-order invoice from delivered orders of one restaurant
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

  select
    count(*)::int,
    count(distinct restaurant_id)::int,
    min(restaurant_id),
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
  from public.orders
  where id = any(v_order_ids)
    and status = 'delivered';

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

create or replace function public.add_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_notes text default null,
  p_payment_date date default current_date
)
returns jsonb
language plpgsql
as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'PST400_INVALID_PAYMENT_AMOUNT';
  end if;

  perform 1 from public.sales_invoices where id = p_invoice_id;
  if not found then
    raise exception 'PST404_INVOICE_NOT_FOUND: %', p_invoice_id;
  end if;

  insert into public.sales_payments (
    invoice_id, amount, payment_date, method, notes
  ) values (
    p_invoice_id,
    round(p_amount, 2),
    coalesce(p_payment_date, current_date),
    nullif(trim(coalesce(p_method, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return public.update_invoice_totals(p_invoice_id);
end;
$$;

create or replace function public.finalize_invoice(
  p_invoice_id uuid,
  p_actor text default 'system'
)
returns void
language plpgsql
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.sales_invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'PST404_INVOICE_NOT_FOUND: %', p_invoice_id;
  end if;
  if v_status = 'cancelled' then
    raise exception 'PST400_CANCELLED_INVOICE';
  end if;
  if v_status = 'finalized' then
    return;
  end if;

  update public.sales_invoices
  set
    status = 'finalized',
    finalized_at = now(),
    finalized_by = coalesce(nullif(trim(coalesce(p_actor, '')), ''), 'system'),
    updated_at = now()
  where id = p_invoice_id;
end;
$$;
