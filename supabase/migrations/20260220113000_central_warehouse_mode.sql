-- Central warehouse mode:
-- 1) Single stock source remains public.stock_qty
-- 2) All stock movements are logged in public.warehouse_transactions
-- 3) Dispatch deduction happens at out_for_delivery via RPC
-- 4) Remove legacy split-location transfer system

create table if not exists public.warehouse_transactions (
  id uuid primary key default gen_random_uuid(),
  txn_date date not null default current_date,
  txn_type text not null check (txn_type in ('purchase_in', 'dispatch_out', 'retail_out', 'adjustment')),
  item_code text not null,
  item_en text not null,
  qty numeric(12,2) not null check (qty > 0),
  signed_qty numeric(12,2) not null,
  unit_price numeric(12,2),
  amount numeric(12,2),
  ref_type text,
  ref_id text,
  notes text,
  created_by text not null default 'system',
  created_at timestamptz not null default now()
);

create index if not exists idx_warehouse_txn_date on public.warehouse_transactions(txn_date desc);
create index if not exists idx_warehouse_txn_item_date on public.warehouse_transactions(item_code, txn_date desc);
create index if not exists idx_warehouse_txn_ref on public.warehouse_transactions(ref_type, ref_id);

alter table public.warehouse_transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'warehouse_transactions'
      and policyname = 'public read warehouse transactions'
  ) then
    create policy "public read warehouse transactions"
      on public.warehouse_transactions
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'warehouse_transactions'
      and policyname = 'public write warehouse transactions'
  ) then
    create policy "public write warehouse transactions"
      on public.warehouse_transactions
      for all using (true) with check (true);
  end if;
end $$;

create or replace function public.post_warehouse_transaction(
  p_txn_type text,
  p_item_code text,
  p_item_en text,
  p_qty numeric,
  p_unit_price numeric default null,
  p_ref_type text default null,
  p_ref_id text default null,
  p_notes text default null,
  p_created_by text default 'system',
  p_txn_date date default current_date
)
returns jsonb
language plpgsql
as $$
declare
  v_signed_qty numeric;
  v_txn_id uuid;
  v_balance numeric;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'PST400_INVALID_QTY';
  end if;

  if p_txn_type not in ('purchase_in', 'dispatch_out', 'retail_out', 'adjustment') then
    raise exception 'PST400_INVALID_TXN_TYPE';
  end if;

  v_signed_qty :=
    case
      when p_txn_type = 'purchase_in' then round(p_qty, 2)
      else round(-1 * p_qty, 2)
    end;

  insert into public.warehouse_transactions (
    txn_date, txn_type, item_code, item_en, qty, signed_qty, unit_price, amount,
    ref_type, ref_id, notes, created_by
  ) values (
    coalesce(p_txn_date, current_date),
    p_txn_type,
    p_item_code,
    p_item_en,
    round(p_qty, 2),
    v_signed_qty,
    case when p_unit_price is null then null else round(p_unit_price, 2) end,
    case when p_unit_price is null then null else round(p_qty * p_unit_price, 2) end,
    nullif(trim(coalesce(p_ref_type, '')), ''),
    nullif(trim(coalesce(p_ref_id, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(nullif(trim(coalesce(p_created_by, '')), ''), 'system')
  )
  returning id into v_txn_id;

  insert into public.stock_qty (item_code, item_en, available_qty, updated_at)
  values (p_item_code, p_item_en, v_signed_qty, now())
  on conflict (item_code) do update
  set
    item_en = excluded.item_en,
    available_qty = round(coalesce(public.stock_qty.available_qty, 0) + excluded.available_qty, 2),
    updated_at = now();

  select round(coalesce(available_qty, 0), 2)
  into v_balance
  from public.stock_qty
  where item_code = p_item_code;

  return jsonb_build_object(
    'transaction_id', v_txn_id,
    'item_code', p_item_code,
    'balance', coalesce(v_balance, 0)
  );
end;
$$;

create or replace function public.post_warehouse_transactions_bulk(
  p_txn_type text,
  p_lines jsonb,
  p_unit_price numeric default null,
  p_ref_type text default null,
  p_ref_id text default null,
  p_notes text default null,
  p_created_by text default 'system',
  p_txn_date date default current_date
)
returns jsonb
language plpgsql
as $$
declare
  v_line record;
  v_count integer := 0;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'PST400_LINES_REQUIRED';
  end if;

  for v_line in
    select
      coalesce(nullif(trim(value->>'item_code'), ''), nullif(trim(value->>'item_en'), ''), 'UNKNOWN') as item_code,
      coalesce(nullif(trim(value->>'item_en'), ''), value->>'item_code', 'UNKNOWN') as item_en,
      round(greatest(0, coalesce((value->>'qty')::numeric, 0)), 2) as qty
    from jsonb_array_elements(p_lines)
  loop
    if v_line.qty <= 0 then
      continue;
    end if;

    perform public.post_warehouse_transaction(
      p_txn_type,
      v_line.item_code,
      v_line.item_en,
      v_line.qty,
      p_unit_price,
      p_ref_type,
      p_ref_id,
      p_notes,
      p_created_by,
      p_txn_date
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('posted_count', v_count);
end;
$$;

create or replace function public.post_order_dispatch_out(
  p_order_id uuid,
  p_actor text default 'system'
)
returns jsonb
language plpgsql
as $$
declare
  v_order public.orders%rowtype;
  v_existing_count integer := 0;
  v_lines jsonb := '[]'::jsonb;
  v_posted jsonb;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'PST404_ORDER_NOT_FOUND';
  end if;

  if v_order.status not in ('purchase_done', 'failed', 'out_for_delivery') then
    raise exception 'PST400_ORDER_STATUS_NOT_DISPATCHABLE: %', v_order.status;
  end if;

  select count(*)::int
  into v_existing_count
  from public.warehouse_transactions wt
  where wt.ref_type = 'order_dispatch'
    and wt.ref_id = p_order_id::text
    and wt.txn_type = 'dispatch_out';

  if v_existing_count = 0 then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'item_code', coalesce(nullif(trim(item->>'code'), ''), nullif(trim(item->>'en'), ''), 'UNKNOWN'),
          'item_en', coalesce(nullif(trim(item->>'en'), ''), item->>'code', 'UNKNOWN'),
          'qty', round(greatest(0, coalesce((item->>'qty')::numeric, 0)), 2)
        )
      ),
      '[]'::jsonb
    )
    into v_lines
    from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) item;

    v_posted := public.post_warehouse_transactions_bulk(
      'dispatch_out',
      v_lines,
      null,
      'order_dispatch',
      p_order_id::text,
      'Dispatch stock out',
      coalesce(nullif(trim(coalesce(p_actor, '')), ''), 'system'),
      coalesce(v_order.delivery_date, current_date)
    );
  else
    v_posted := jsonb_build_object('posted_count', 0);
  end if;

  if v_order.status <> 'out_for_delivery' then
    update public.orders
    set
      status = 'out_for_delivery',
      updated_at = now()
    where id = p_order_id;
  end if;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'out_for_delivery',
    'already_posted', v_existing_count > 0,
    'posted', v_posted
  );
end;
$$;

-- Ensure finalize writes transaction log for purchase-in rows.
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
      greatest(0, coalesce(p.variance_qty, 0)) as new_positive,
      greatest(0, coalesce(p.unit_price, 0)) as unit_price
  ),
  stock_deltas as (
    select
      u.item_key,
      u.item_code,
      u.item_en,
      u.unit_price,
      round(greatest(0, u.new_positive - coalesce(o.old_positive, 0)), 2) as delta
    from updated_rows u
    left join old_rows o on o.id = u.id
  ),
  logged as (
    insert into public.warehouse_transactions (
      txn_date, txn_type, item_code, item_en, qty, signed_qty, unit_price, amount,
      ref_type, ref_id, notes, created_by
    )
    select
      v_day.purchase_date,
      'purchase_in',
      coalesce(sd.item_code, sd.item_key),
      sd.item_en,
      sd.delta,
      sd.delta,
      sd.unit_price,
      round(sd.delta * sd.unit_price, 2),
      'purchase_finalize_run',
      p_purchase_day_id::text,
      'Finalized purchase stock in',
      'system'
    from stock_deltas sd
    where sd.delta > 0
    returning item_code, item_en, signed_qty
  )
  insert into public.stock_qty (item_code, item_en, available_qty, updated_at)
  select
    l.item_code,
    l.item_en,
    l.signed_qty,
    now()
  from logged l
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

-- Hard remove split-location transfer system
drop trigger if exists trg_sync_main_balance_from_stock_qty on public.stock_qty;
drop function if exists public.sync_main_balance_from_stock_qty();
drop function if exists public.create_stock_transfer(text, text, jsonb, text, text);

drop table if exists public.stock_transfer_lines cascade;
drop table if exists public.stock_transfers cascade;
drop table if exists public.stock_balances cascade;
drop table if exists public.inventory_locations cascade;
