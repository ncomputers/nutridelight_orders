-- Minimal order flow extension:
-- pending -> confirmed -> purchase_done -> out_for_delivery -> delivered -> invoiced
-- plus existing failure/rejection branches.

create or replace function public.validate_order_status_transition(old_status text, new_status text)
returns boolean
language plpgsql
as $$
begin
  if old_status = new_status then return true; end if;
  if old_status = 'pending' and new_status in ('confirmed', 'rejected') then return true; end if;
  if old_status = 'confirmed' and new_status in ('purchase_done', 'failed') then return true; end if;
  if old_status = 'purchase_done' and new_status in ('out_for_delivery', 'failed') then return true; end if;
  if old_status = 'out_for_delivery' and new_status in ('delivered', 'failed') then return true; end if;
  if old_status = 'delivered' and new_status = 'invoiced' then return true; end if;
  if old_status = 'failed' and new_status = 'out_for_delivery' then return true; end if;
  return false;
end;
$$;

create or replace function public.mark_orders_purchase_done_for_day(p_purchase_date date)
returns integer
language plpgsql
as $$
declare
  v_pending_count integer := 0;
  v_updated_count integer := 0;
begin
  select count(*)::int
  into v_pending_count
  from public.purchase_plans p
  where p.purchase_date = p_purchase_date
    and round(coalesce(p.final_qty, 0) - coalesce(p.purchased_qty, 0), 2) > 0;

  if v_pending_count > 0 then
    return 0;
  end if;

  with updated as (
    update public.orders o
    set
      status = 'purchase_done',
      updated_at = now()
    where o.status = 'confirmed'
      and exists (
        select 1
        from public.purchase_plans p
        where p.purchase_date = p_purchase_date
          and exists (
            select 1
            from jsonb_array_elements(coalesce(p.source_orders, '[]'::jsonb)) ref
            where ref ->> 'order_ref' = o.order_ref
          )
      )
    returning 1
  )
  select count(*)::int into v_updated_count from updated;

  return v_updated_count;
end;
$$;

create or replace function public.trg_mark_orders_purchase_done_from_finalize_run()
returns trigger
language plpgsql
as $$
begin
  perform public.mark_orders_purchase_done_for_day(new.purchase_date);
  return new;
end;
$$;

drop trigger if exists trg_mark_orders_purchase_done_from_finalize_run on public.purchase_finalize_runs;
create trigger trg_mark_orders_purchase_done_from_finalize_run
after insert on public.purchase_finalize_runs
for each row
execute function public.trg_mark_orders_purchase_done_from_finalize_run();

create or replace function public.trg_mark_order_invoiced_from_invoice_link()
returns trigger
language plpgsql
as $$
begin
  update public.orders
  set
    status = 'invoiced',
    updated_at = now()
  where id = new.order_id
    and status = 'delivered';
  return new;
end;
$$;

drop trigger if exists trg_mark_order_invoiced_from_invoice_link on public.sales_invoice_orders;
create trigger trg_mark_order_invoiced_from_invoice_link
after insert on public.sales_invoice_orders
for each row
execute function public.trg_mark_order_invoiced_from_invoice_link();

-- Backfill already invoiced orders.
update public.orders o
set
  status = 'invoiced',
  updated_at = now()
where o.status = 'delivered'
  and exists (
    select 1
    from public.sales_invoice_orders sio
    where sio.order_id = o.id
  );

-- Backfill purchase_done for already locked/finalized purchase dates when there is no pending qty.
do $$
declare
  d date;
begin
  for d in (
    select distinct l.purchase_date
    from public.purchase_day_locks l
    where l.is_locked = true
  ) loop
    perform public.mark_orders_purchase_done_for_day(d);
  end loop;
end $$;
