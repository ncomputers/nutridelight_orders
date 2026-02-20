-- Make status audit trigger table-agnostic for status column name.
-- Supports tables with `status` and tables with `purchase_status`.

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
    coalesce(to_jsonb(old)->>'status', to_jsonb(old)->>'purchase_status'),
    coalesce(to_jsonb(new)->>'status', to_jsonb(new)->>'purchase_status'),
    coalesce(to_jsonb(new)->>'finalized_by', 'system'),
    jsonb_build_object('table', tg_table_name)
  );
  return new;
end;
$$;
