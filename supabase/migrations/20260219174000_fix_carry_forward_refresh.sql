create or replace function public.generate_carry_forward_for_day(p_purchase_date date)
returns integer
language plpgsql
as $$
declare
  v_next_date date;
  v_count integer := 0;
begin
  v_next_date := p_purchase_date + interval '1 day';

  -- Always clear previous carry rows for this source day so reopen/re-finalize stays correct.
  delete from public.purchase_carry_forwards
  where source_purchase_date = p_purchase_date
    and carry_date = v_next_date;

  with pending_rows as (
    select
      coalesce(p.item_code, p.item_en) as item_code,
      p.item_en,
      round(greatest(0, coalesce(p.final_qty, 0) - coalesce(p.purchased_qty, 0)), 2) as pending_qty
    from public.purchase_plans p
    where p.purchase_date = p_purchase_date
      and round(coalesce(p.final_qty, 0) - coalesce(p.purchased_qty, 0), 2) > 0
  ),
  inserted as (
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
    returning 1
  )
  select count(*)::int into v_count from inserted;

  return v_count;
end;
$$;
