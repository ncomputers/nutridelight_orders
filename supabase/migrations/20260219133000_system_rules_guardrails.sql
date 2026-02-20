-- 1) Normalized order items (dual-write target)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_code text not null,
  item_en text not null,
  item_hi text,
  qty numeric not null default 0 check (qty >= 0),
  unit text not null default 'kg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, item_code, item_en)
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

alter table public.order_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'order_items' and policyname = 'public read order items'
  ) then
    create policy "public read order items"
    on public.order_items for select using (true);
  end if;
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'order_items' and policyname = 'public insert order items'
  ) then
    create policy "public insert order items"
    on public.order_items for insert with check (true);
  end if;
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'order_items' and policyname = 'public update order items'
  ) then
    create policy "public update order items"
    on public.order_items for update using (true);
  end if;
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'order_items' and policyname = 'public delete order items'
  ) then
    create policy "public delete order items"
    on public.order_items for delete using (true);
  end if;
end $$;

create or replace function public.sync_order_items_from_order()
returns trigger
language plpgsql
as $$
begin
  delete from public.order_items where order_id = new.id;

  if jsonb_typeof(coalesce(new.items::jsonb, '[]'::jsonb)) = 'array' then
    insert into public.order_items (
      order_id,
      item_code,
      item_en,
      item_hi,
      qty,
      unit,
      updated_at
    )
    select
      new.id,
      coalesce(
        nullif(trim(coalesce(item->>'code', '')), ''),
        'GEN_' || upper(regexp_replace(coalesce(item->>'en', 'UNKNOWN'), '[^A-Za-z0-9]+', '_', 'g'))
      ) as item_code,
      coalesce(nullif(trim(coalesce(item->>'en', '')), ''), 'Unknown Item') as item_en,
      nullif(trim(coalesce(item->>'hi', '')), '') as item_hi,
      greatest(0, round(coalesce((item->>'qty')::numeric, 0), 2)) as qty,
      'kg' as unit,
      now()
    from jsonb_array_elements(coalesce(new.items::jsonb, '[]'::jsonb)) as item
    where coalesce((item->>'qty')::numeric, 0) >= 0
    on conflict (order_id, item_code, item_en) do update
    set
      qty = round(public.order_items.qty + excluded.qty, 2),
      item_hi = coalesce(excluded.item_hi, public.order_items.item_hi),
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_order_items_from_order on public.orders;
create trigger trg_sync_order_items_from_order
after insert or update of items
on public.orders
for each row
execute function public.sync_order_items_from_order();

-- Backfill existing orders into normalized order_items
do $$
declare
  rec record;
begin
  for rec in select id, items from public.orders
  loop
    update public.orders
    set items = rec.items
    where id = rec.id;
  end loop;
end $$;

-- 2) Audit tables
create table if not exists public.state_transition_audit (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  from_status text,
  to_status text not null,
  actor text,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_plan_audit (
  id uuid primary key default gen_random_uuid(),
  purchase_plan_id uuid not null,
  purchase_date date not null,
  item_code text not null,
  action text not null,
  before_row jsonb,
  after_row jsonb,
  actor text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_finalize_runs (
  id uuid primary key default gen_random_uuid(),
  purchase_day_lock_id uuid not null references public.purchase_day_locks(id) on delete cascade,
  purchase_date date not null,
  finalize_seq integer not null default 0,
  status text not null default 'completed',
  run_meta jsonb,
  created_at timestamptz not null default now(),
  unique (purchase_day_lock_id, finalize_seq)
);

alter table public.state_transition_audit enable row level security;
alter table public.purchase_plan_audit enable row level security;
alter table public.purchase_finalize_runs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_transition_audit' and policyname='public read state transition audit') then
    create policy "public read state transition audit" on public.state_transition_audit for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='state_transition_audit' and policyname='public insert state transition audit') then
    create policy "public insert state transition audit" on public.state_transition_audit for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_plan_audit' and policyname='public read purchase plan audit') then
    create policy "public read purchase plan audit" on public.purchase_plan_audit for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_plan_audit' and policyname='public insert purchase plan audit') then
    create policy "public insert purchase plan audit" on public.purchase_plan_audit for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_finalize_runs' and policyname='public read purchase finalize runs') then
    create policy "public read purchase finalize runs" on public.purchase_finalize_runs for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_finalize_runs' and policyname='public insert purchase finalize runs') then
    create policy "public insert purchase finalize runs" on public.purchase_finalize_runs for insert with check (true);
  end if;
end $$;

-- 3) State-machine validators
create or replace function public.validate_order_status_transition(old_status text, new_status text)
returns boolean
language plpgsql
as $$
begin
  if old_status = new_status then return true; end if;
  if old_status = 'pending' and new_status in ('confirmed', 'rejected') then return true; end if;
  if old_status = 'confirmed' and new_status in ('out_for_delivery', 'failed') then return true; end if;
  if old_status = 'out_for_delivery' and new_status in ('delivered', 'failed') then return true; end if;
  if old_status = 'failed' and new_status = 'out_for_delivery' then return true; end if;
  return false;
end;
$$;

create or replace function public.validate_invoice_status_transition(old_status text, new_status text)
returns boolean
language plpgsql
as $$
begin
  if old_status = new_status then return true; end if;
  if old_status = 'draft' and new_status = 'finalized' then return true; end if;
  if old_status = 'draft' and new_status = 'cancelled' then return true; end if;
  if old_status = 'finalized' and new_status = 'cancelled' then return true; end if;
  return false;
end;
$$;

create or replace function public.guard_order_status_transition()
returns trigger
language plpgsql
as $$
begin
  if not public.validate_order_status_transition(old.status, new.status) then
    raise exception 'PST001_INVALID_ORDER_TRANSITION: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;

create or replace function public.guard_invoice_status_transition()
returns trigger
language plpgsql
as $$
begin
  if not public.validate_invoice_status_transition(old.status, new.status) then
    raise exception 'PST001_INVALID_INVOICE_TRANSITION: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_order_status_transition on public.orders;
create trigger trg_guard_order_status_transition
before update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.guard_order_status_transition();

drop trigger if exists trg_guard_invoice_status_transition on public.sales_invoices;
create trigger trg_guard_invoice_status_transition
before update of status on public.sales_invoices
for each row
when (old.status is distinct from new.status)
execute function public.guard_invoice_status_transition();

create or replace function public.audit_status_transition()
returns trigger
language plpgsql
as $$
begin
  insert into public.state_transition_audit (
    entity_type, entity_id, from_status, to_status, actor, metadata
  ) values (
    tg_argv[0],
    old.id,
    old.status,
    new.status,
    coalesce(new.finalized_by, 'system'),
    jsonb_build_object('table', tg_table_name)
  );
  return new;
end;
$$;

drop trigger if exists trg_audit_order_status_transition on public.orders;
create trigger trg_audit_order_status_transition
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.audit_status_transition('orders');

drop trigger if exists trg_audit_invoice_status_transition on public.sales_invoices;
create trigger trg_audit_invoice_status_transition
after update of status on public.sales_invoices
for each row
when (old.status is distinct from new.status)
execute function public.audit_status_transition('sales_invoices');

-- 4) Purchase protections + idempotency counters
alter table public.purchase_day_locks
add column if not exists finalize_seq integer not null default 0;

create or replace function public.bump_finalize_seq_on_reopen()
returns trigger
language plpgsql
as $$
begin
  if old.is_locked = true and new.is_locked = false then
    new.finalize_seq := coalesce(old.finalize_seq, 0) + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bump_finalize_seq_on_reopen on public.purchase_day_locks;
create trigger trg_bump_finalize_seq_on_reopen
before update on public.purchase_day_locks
for each row
execute function public.bump_finalize_seq_on_reopen();

create or replace function public.guard_finalized_purchase_update()
returns trigger
language plpgsql
as $$
declare
  v_is_locked boolean := false;
begin
  select coalesce(is_locked, false)
  into v_is_locked
  from public.purchase_day_locks
  where purchase_date = old.purchase_date
  limit 1;

  if old.purchase_status = 'finalized' and v_is_locked then
    if (
      old.ordered_qty is distinct from new.ordered_qty or
      old.adjustment_qty is distinct from new.adjustment_qty or
      old.final_qty is distinct from new.final_qty or
      old.purchased_qty is distinct from new.purchased_qty or
      old.pack_size is distinct from new.pack_size or
      old.pack_count is distinct from new.pack_count or
      old.unit_price is distinct from new.unit_price or
      old.line_total is distinct from new.line_total or
      old.variance_qty is distinct from new.variance_qty or
      old.purchase_status is distinct from new.purchase_status
    ) then
      raise exception 'PST002_FINALIZED_PURCHASE_LOCKED: purchase row is finalized and day is locked';
    end if;
  end if;

  if old.purchase_status is distinct from new.purchase_status then
    if old.purchase_status = 'draft' and new.purchase_status = 'finalized' then
      return new;
    end if;
    if old.purchase_status = 'finalized' and new.purchase_status = 'draft' and not v_is_locked then
      return new;
    end if;
    raise exception 'PST001_INVALID_PURCHASE_TRANSITION: % -> %', old.purchase_status, new.purchase_status;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_finalized_purchase_update on public.purchase_plans;
create trigger trg_guard_finalized_purchase_update
before update on public.purchase_plans
for each row
execute function public.guard_finalized_purchase_update();

create or replace function public.audit_purchase_plan_update()
returns trigger
language plpgsql
as $$
begin
  insert into public.purchase_plan_audit (
    purchase_plan_id, purchase_date, item_code, action, before_row, after_row, actor
  ) values (
    old.id,
    old.purchase_date,
    coalesce(new.item_code, old.item_code, old.item_en),
    case when old.purchase_status is distinct from new.purchase_status then 'status_change' else 'update' end,
    to_jsonb(old),
    to_jsonb(new),
    coalesce(new.finalized_by, old.finalized_by, 'system')
  );
  return new;
end;
$$;

drop trigger if exists trg_audit_purchase_plan_update on public.purchase_plans;
create trigger trg_audit_purchase_plan_update
after update on public.purchase_plans
for each row
execute function public.audit_purchase_plan_update();

drop trigger if exists trg_audit_purchase_status_transition on public.purchase_plans;
create trigger trg_audit_purchase_status_transition
after update of purchase_status on public.purchase_plans
for each row
when (old.purchase_status is distinct from new.purchase_status)
execute function public.audit_status_transition('purchase_plans');

-- 5) Item identity hardening (backfill + checks for new writes)
update public.purchase_plans
set item_code = coalesce(
  nullif(trim(item_code), ''),
  'GEN_' || upper(regexp_replace(coalesce(item_en, 'UNKNOWN'), '[^A-Za-z0-9]+', '_', 'g'))
)
where item_code is null or trim(item_code) = '';

update public.sales_invoice_lines
set item_code = coalesce(
  nullif(trim(item_code), ''),
  'GEN_' || upper(regexp_replace(coalesce(item_en, 'UNKNOWN'), '[^A-Za-z0-9]+', '_', 'g'))
)
where item_code is null or trim(item_code) = '';

alter table public.purchase_plans
drop constraint if exists purchase_plans_item_code_required;
alter table public.purchase_plans
add constraint purchase_plans_item_code_required check (item_code is not null and length(trim(item_code)) > 0);

alter table public.sales_invoice_lines
drop constraint if exists sales_invoice_lines_item_code_required;
alter table public.sales_invoice_lines
add constraint sales_invoice_lines_item_code_required check (item_code is not null and length(trim(item_code)) > 0);

-- 6) Replace RPCs with stronger authoritative behavior
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
    raise exception 'PST404_ORDER_NOT_FOUND: %', p_order_id;
  end if;

  if coalesce(v_order.restaurant_id::text, '') = '' then
    raise exception 'PST003_MISSING_RESTAURANT: %', p_order_id;
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
    0, 0, 0, 0, 0, 0, 'unpaid',
    null,
    now()
  )
  returning id into v_invoice_id;

  if exists (select 1 from public.order_items where order_id = p_order_id) then
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
      oi.item_code,
      oi.item_en,
      oi.item_hi,
      greatest(0, round(oi.qty, 2)),
      coalesce(nullif(trim(oi.unit), ''), 'kg'),
      0,
      0,
      null,
      now()
    from public.order_items oi
    where oi.order_id = p_order_id;
  elsif jsonb_typeof(coalesce(v_order.items::jsonb, '[]'::jsonb)) = 'array' then
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
      coalesce(
        nullif(trim(coalesce(item->>'code', '')), ''),
        'GEN_' || upper(regexp_replace(coalesce(item->>'en', 'UNKNOWN'), '[^A-Za-z0-9]+', '_', 'g'))
      ),
      coalesce(nullif(trim(coalesce(item->>'en', '')), ''), 'Unknown Item'),
      nullif(trim(coalesce(item->>'hi', '')), ''),
      greatest(0, round(coalesce((item->>'qty')::numeric, 0), 2)),
      'kg',
      0,
      0,
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
  v_payment_status := case when v_due = 0 then 'paid' else 'unpaid' end;

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
returns jsonb
language plpgsql
as $$
declare
  v_day public.purchase_day_locks%rowtype;
  v_run_id uuid;
  v_existing_run_id uuid;
begin
  select *
  into v_day
  from public.purchase_day_locks
  where id = p_purchase_day_id
  for update;

  if not found then
    raise exception 'PST404_PURCHASE_DAY_NOT_FOUND: %', p_purchase_day_id;
  end if;

  select id
  into v_existing_run_id
  from public.purchase_finalize_runs
  where purchase_day_lock_id = v_day.id
    and finalize_seq = coalesce(v_day.finalize_seq, 0)
  limit 1;

  if v_day.is_locked and v_existing_run_id is not null then
    return jsonb_build_object(
      'purchase_date', v_day.purchase_date,
      'run_id', v_existing_run_id,
      'already_finalized', true
    );
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

  insert into public.purchase_finalize_runs (
    purchase_day_lock_id,
    purchase_date,
    finalize_seq,
    status,
    run_meta
  ) values (
    v_day.id,
    v_day.purchase_date,
    coalesce(v_day.finalize_seq, 0),
    'completed',
    jsonb_build_object('source', 'finalize_purchase_rpc')
  )
  returning id into v_run_id;

  return jsonb_build_object(
    'purchase_date', v_day.purchase_date,
    'run_id', v_run_id,
    'already_finalized', false
  );
end;
$$;
