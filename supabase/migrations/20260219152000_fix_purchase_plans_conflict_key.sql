-- Solid conflict key for purchase upserts: (purchase_date, item_code)
-- This removes dependence on partial/legacy uniqueness and prevents ON CONFLICT mismatch errors.

-- 1) Normalize item_code values.
update public.purchase_plans
set item_code = nullif(trim(item_code), '')
where item_code is not null
  and item_code <> trim(item_code);

update public.purchase_plans
set item_code = trim(item_en)
where item_code is null
  and item_en is not null
  and length(trim(item_en)) > 0;

-- 2) Deduplicate by the new canonical key, keep latest row.
with ranked as (
  select
    id,
    row_number() over (
      partition by purchase_date, item_code
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.purchase_plans
  where item_code is not null
)
delete from public.purchase_plans p
using ranked r
where p.id = r.id
  and r.rn > 1;

-- 3) Remove legacy uniqueness keyed by item_en.
alter table public.purchase_plans
drop constraint if exists purchase_plans_purchase_date_item_en_key;

-- 4) Replace partial index with a strict unique key used by onConflict.
drop index if exists public.purchase_plans_item_code_date_unique;
create unique index if not exists purchase_plans_purchase_date_item_code_key
  on public.purchase_plans (purchase_date, item_code);

-- 5) Enforce non-null key.
alter table public.purchase_plans
alter column item_code set not null;
