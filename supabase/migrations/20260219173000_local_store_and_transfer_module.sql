-- Local store + transfer module + purchase demand RPC.

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location_type text not null check (location_type in ('main_store', 'local_store', 'restaurant', 'virtual')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_balances (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.inventory_locations(id) on delete cascade,
  item_code text not null,
  item_en text not null,
  qty numeric not null default 0 check (qty >= 0),
  updated_at timestamptz not null default now(),
  unique (location_id, item_code)
);

create table if not exists public.local_store_inventory_policy (
  id uuid primary key default gen_random_uuid(),
  item_code text not null unique,
  item_en text not null,
  min_qty numeric not null default 0 check (min_qty >= 0),
  target_qty numeric not null default 0 check (target_qty >= 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  check (target_qty >= min_qty)
);

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_no text not null unique,
  from_location_id uuid not null references public.inventory_locations(id),
  to_location_id uuid not null references public.inventory_locations(id),
  transfer_date date not null default current_date,
  status text not null default 'posted' check (status in ('posted', 'cancelled')),
  notes text null,
  created_by text not null default 'system',
  created_at timestamptz not null default now(),
  check (from_location_id <> to_location_id)
);

create table if not exists public.stock_transfer_lines (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.stock_transfers(id) on delete cascade,
  item_code text not null,
  item_en text not null,
  qty numeric not null check (qty > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_day_settings (
  purchase_date date primary key,
  need_mode text not null default 'net' check (need_mode in ('net', 'gross')),
  is_locked boolean not null default false,
  locked_at timestamptz null,
  reopened_at timestamptz null,
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_carry_forwards (
  id uuid primary key default gen_random_uuid(),
  carry_date date not null,
  source_purchase_date date not null,
  item_code text not null,
  item_en text not null,
  qty_remaining numeric not null check (qty_remaining > 0),
  updated_at timestamptz not null default now(),
  unique (carry_date, source_purchase_date, item_code)
);

create index if not exists idx_stock_balances_location_item on public.stock_balances(location_id, item_code);
create index if not exists idx_stock_transfers_date on public.stock_transfers(transfer_date);
create index if not exists idx_purchase_carry_forwards_carry_date on public.purchase_carry_forwards(carry_date);

alter table public.inventory_locations enable row level security;
alter table public.stock_balances enable row level security;
alter table public.local_store_inventory_policy enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.stock_transfer_lines enable row level security;
alter table public.purchase_day_settings enable row level security;
alter table public.purchase_carry_forwards enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inventory_locations' and policyname='public read inventory locations') then
    create policy "public read inventory locations" on public.inventory_locations for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inventory_locations' and policyname='public write inventory locations') then
    create policy "public write inventory locations" on public.inventory_locations for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stock_balances' and policyname='public read stock balances') then
    create policy "public read stock balances" on public.stock_balances for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stock_balances' and policyname='public write stock balances') then
    create policy "public write stock balances" on public.stock_balances for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='local_store_inventory_policy' and policyname='public read local store policy') then
    create policy "public read local store policy" on public.local_store_inventory_policy for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='local_store_inventory_policy' and policyname='public write local store policy') then
    create policy "public write local store policy" on public.local_store_inventory_policy for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stock_transfers' and policyname='public read stock transfers') then
    create policy "public read stock transfers" on public.stock_transfers for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stock_transfers' and policyname='public write stock transfers') then
    create policy "public write stock transfers" on public.stock_transfers for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stock_transfer_lines' and policyname='public read stock transfer lines') then
    create policy "public read stock transfer lines" on public.stock_transfer_lines for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stock_transfer_lines' and policyname='public write stock transfer lines') then
    create policy "public write stock transfer lines" on public.stock_transfer_lines for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_day_settings' and policyname='public read purchase day settings') then
    create policy "public read purchase day settings" on public.purchase_day_settings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_day_settings' and policyname='public write purchase day settings') then
    create policy "public write purchase day settings" on public.purchase_day_settings for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_carry_forwards' and policyname='public read purchase carry forwards') then
    create policy "public read purchase carry forwards" on public.purchase_carry_forwards for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_carry_forwards' and policyname='public write purchase carry forwards') then
    create policy "public write purchase carry forwards" on public.purchase_carry_forwards for all using (true) with check (true);
  end if;
end $$;

insert into public.inventory_locations (code, name, location_type, is_active)
values
  ('MAIN_STORE', 'Main Store', 'main_store', true),
  ('LOCAL_STORE', 'Local Store', 'local_store', true)
on conflict (code) do update
set
  name = excluded.name,
  location_type = excluded.location_type,
  is_active = excluded.is_active;

-- Backfill MAIN_STORE balances from stock_qty.
insert into public.stock_balances (location_id, item_code, item_en, qty, updated_at)
select
  l.id,
  s.item_code,
  s.item_en,
  greatest(0, coalesce(s.available_qty, 0)),
  now()
from public.stock_qty s
join public.inventory_locations l on l.code = 'MAIN_STORE'
on conflict (location_id, item_code) do update
set
  item_en = excluded.item_en,
  qty = excluded.qty,
  updated_at = now();

create or replace function public.sync_main_balance_from_stock_qty()
returns trigger
language plpgsql
as $$
declare
  v_main_id uuid;
begin
  select id into v_main_id from public.inventory_locations where code = 'MAIN_STORE' limit 1;
  if v_main_id is null then
    return new;
  end if;

  insert into public.stock_balances (location_id, item_code, item_en, qty, updated_at)
  values (
    v_main_id,
    new.item_code,
    new.item_en,
    greatest(0, coalesce(new.available_qty, 0)),
    now()
  )
  on conflict (location_id, item_code) do update
  set
    item_en = excluded.item_en,
    qty = excluded.qty,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sync_main_balance_from_stock_qty on public.stock_qty;
create trigger trg_sync_main_balance_from_stock_qty
after insert or update on public.stock_qty
for each row
execute function public.sync_main_balance_from_stock_qty();

create or replace function public.upsert_purchase_day_setting(
  p_purchase_date date,
  p_need_mode text default 'net'
)
returns void
language plpgsql
as $$
begin
  insert into public.purchase_day_settings (purchase_date, need_mode, updated_at)
  values (p_purchase_date, case when p_need_mode in ('net', 'gross') then p_need_mode else 'net' end, now())
  on conflict (purchase_date) do update
  set
    need_mode = excluded.need_mode,
    updated_at = now();
end;
$$;

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
  local_gap as (
    select
      p.item_code,
      p.item_en,
      round(greatest(0, coalesce(p.target_qty, 0) - coalesce(lb.qty, 0)), 2) as qty
    from public.local_store_inventory_policy p
    left join public.inventory_locations loc on loc.code = 'LOCAL_STORE'
    left join public.stock_balances lb on lb.location_id = loc.id and lb.item_code = p.item_code
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
  ),
  main_avail as (
    select
      b.item_code,
      round(coalesce(b.qty, 0), 2) as qty
    from public.stock_balances b
    join public.inventory_locations l on l.id = b.location_id
    where l.code = 'MAIN_STORE'
  )
  select
    m.item_code,
    m.item_en,
    m.restaurant_qty,
    m.local_policy_qty,
    m.carry_qty,
    round(m.restaurant_qty + m.local_policy_qty + m.carry_qty, 2) as gross_required_qty,
    round(coalesce(a.qty, 0), 2) as main_available_qty,
    round(
      case
        when v_mode = 'net' then greatest(0, (m.restaurant_qty + m.local_policy_qty + m.carry_qty) - coalesce(a.qty, 0))
        else (m.restaurant_qty + m.local_policy_qty + m.carry_qty)
      end,
      2
    ) as required_qty,
    v_mode as need_mode
  from merged m
  left join main_avail a on a.item_code = m.item_code
  order by m.item_en asc;
end;
$$;

create or replace function public.create_stock_transfer(
  p_from_location_code text,
  p_to_location_code text,
  p_lines jsonb,
  p_notes text default null,
  p_actor text default 'system'
)
returns uuid
language plpgsql
as $$
declare
  v_from_id uuid;
  v_to_id uuid;
  v_transfer_id uuid;
  v_transfer_no text;
  v_line record;
  v_from_qty numeric;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'PST400_TRANSFER_LINES_REQUIRED';
  end if;

  select id into v_from_id from public.inventory_locations where code = p_from_location_code and is_active = true limit 1;
  select id into v_to_id from public.inventory_locations where code = p_to_location_code and is_active = true limit 1;
  if v_from_id is null or v_to_id is null then
    raise exception 'PST404_TRANSFER_LOCATION_NOT_FOUND';
  end if;
  if v_from_id = v_to_id then
    raise exception 'PST400_TRANSFER_SAME_LOCATION';
  end if;

  loop
    v_transfer_no := 'TR-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.stock_transfers where transfer_no = v_transfer_no);
  end loop;

  insert into public.stock_transfers (
    transfer_no, from_location_id, to_location_id, transfer_date, status, notes, created_by
  ) values (
    v_transfer_no, v_from_id, v_to_id, current_date, 'posted', nullif(trim(coalesce(p_notes, '')), ''), coalesce(nullif(trim(coalesce(p_actor, '')), ''), 'system')
  )
  returning id into v_transfer_id;

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

    select round(coalesce(qty, 0), 2)
    into v_from_qty
    from public.stock_balances
    where location_id = v_from_id
      and item_code = v_line.item_code
    for update;

    if coalesce(v_from_qty, 0) < v_line.qty then
      raise exception 'PST400_INSUFFICIENT_STOCK: %', v_line.item_code;
    end if;

    insert into public.stock_transfer_lines (transfer_id, item_code, item_en, qty)
    values (v_transfer_id, v_line.item_code, v_line.item_en, v_line.qty);

    update public.stock_balances
    set qty = round(greatest(0, coalesce(qty, 0) - v_line.qty), 2), updated_at = now()
    where location_id = v_from_id and item_code = v_line.item_code;

    insert into public.stock_balances (location_id, item_code, item_en, qty, updated_at)
    values (v_to_id, v_line.item_code, v_line.item_en, v_line.qty, now())
    on conflict (location_id, item_code) do update
    set
      item_en = excluded.item_en,
      qty = round(coalesce(public.stock_balances.qty, 0) + excluded.qty, 2),
      updated_at = now();

    -- Compatibility sync for MAIN_STORE with legacy stock_qty table used by existing UI.
    if p_from_location_code = 'MAIN_STORE' then
      update public.stock_qty
      set available_qty = round(greatest(0, coalesce(available_qty, 0) - v_line.qty), 2), updated_at = now()
      where item_code = v_line.item_code;
    end if;

    if p_to_location_code = 'MAIN_STORE' then
      insert into public.stock_qty (item_code, item_en, available_qty, updated_at)
      values (v_line.item_code, v_line.item_en, v_line.qty, now())
      on conflict (item_code) do update
      set
        item_en = excluded.item_en,
        available_qty = round(coalesce(public.stock_qty.available_qty, 0) + excluded.available_qty, 2),
        updated_at = now();
    end if;
  end loop;

  return v_transfer_id;
end;
$$;

create or replace function public.generate_carry_forward_for_day(p_purchase_date date)
returns integer
language plpgsql
as $$
declare
  v_next_date date;
  v_count integer := 0;
begin
  v_next_date := p_purchase_date + interval '1 day';

  with pending_rows as (
    select
      coalesce(p.item_code, p.item_en) as item_code,
      p.item_en,
      round(greatest(0, coalesce(p.final_qty, 0) - coalesce(p.purchased_qty, 0)), 2) as pending_qty
    from public.purchase_plans p
    where p.purchase_date = p_purchase_date
      and round(coalesce(p.final_qty, 0) - coalesce(p.purchased_qty, 0), 2) > 0
  ),
  upserted as (
    insert into public.purchase_carry_forwards (
      carry_date, source_purchase_date, item_code, item_en, qty_remaining, updated_at
    )
    select
      v_next_date,
      p_purchase_date,
      r.item_code,
      r.item_en,
      r.pending_qty,
      now()
    from pending_rows r
    on conflict (carry_date, source_purchase_date, item_code) do update
    set
      item_en = excluded.item_en,
      qty_remaining = excluded.qty_remaining,
      updated_at = now()
    returning 1
  )
  select count(*)::int into v_count from upserted;

  return v_count;
end;
$$;

create or replace function public.trg_generate_carry_forward_from_finalize_run()
returns trigger
language plpgsql
as $$
begin
  perform public.generate_carry_forward_for_day(new.purchase_date);
  return new;
end;
$$;

drop trigger if exists trg_generate_carry_forward_from_finalize_run on public.purchase_finalize_runs;
create trigger trg_generate_carry_forward_from_finalize_run
after insert on public.purchase_finalize_runs
for each row
execute function public.trg_generate_carry_forward_from_finalize_run();
