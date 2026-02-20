-- Fix status audit trigger to work across tables that do not have finalized_by.

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
    coalesce(to_jsonb(new)->>'finalized_by', 'system'),
    jsonb_build_object('table', tg_table_name)
  );
  return new;
end;
$$;
