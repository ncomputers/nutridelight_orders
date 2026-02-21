-- Security + load hardening patch

-- 1) Restrict direct access to sensitive restaurant portal tables.
drop policy if exists "public read restaurant portal users" on public.restaurant_portal_users;
drop policy if exists "public write restaurant portal users" on public.restaurant_portal_users;
create policy "deny direct restaurant portal users"
  on public.restaurant_portal_users
  for all
  using (false)
  with check (false);

drop policy if exists "public read restaurant portal sessions" on public.restaurant_portal_sessions;
drop policy if exists "public write restaurant portal sessions" on public.restaurant_portal_sessions;
create policy "deny direct restaurant portal sessions"
  on public.restaurant_portal_sessions
  for all
  using (false)
  with check (false);

drop policy if exists "public read restaurant support issues" on public.restaurant_support_issues;
drop policy if exists "public write restaurant support issues" on public.restaurant_support_issues;
create policy "deny direct restaurant support issues"
  on public.restaurant_support_issues
  for all
  using (false)
  with check (false);

-- 2) Remove direct password column visibility from API roles.
revoke select on table public.app_users from anon, authenticated;
grant select (id, name, username, role, is_active, created_at) on public.app_users to anon, authenticated;

-- 3) Login RPC to avoid client-side password reads.
create or replace function public.app_user_login(
  p_username text,
  p_password text,
  p_allowed_roles text[] default array['purchase', 'sales']::text[]
)
returns table (
  id uuid,
  name text,
  username text,
  role text,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := lower(trim(coalesce(p_username, '')));

  if v_username = '' or nullif(coalesce(p_password, ''), '') is null then
    return;
  end if;

  return query
  select
    u.id,
    u.name,
    u.username,
    u.role,
    u.is_active
  from public.app_users u
  where lower(u.username) = v_username
    and u.password = p_password
    and u.is_active = true
    and (
      p_allowed_roles is null
      or coalesce(array_length(p_allowed_roles, 1), 0) = 0
      or u.role = any(p_allowed_roles)
    )
  limit 1;
end;
$$;

-- 4) Tighten EXECUTE grants for SECURITY DEFINER functions.
revoke execute on function public._restaurant_portal_session_context(text) from public, anon, authenticated;

revoke execute on function public.app_user_login(text, text, text[]) from public;
grant execute on function public.app_user_login(text, text, text[]) to anon, authenticated;

revoke execute on function public.restaurant_portal_login(text, text, text) from public;
grant execute on function public.restaurant_portal_login(text, text, text) to anon, authenticated;

revoke execute on function public.restaurant_portal_logout(text) from public;
grant execute on function public.restaurant_portal_logout(text) to anon, authenticated;

revoke execute on function public.restaurant_portal_me(text) from public;
grant execute on function public.restaurant_portal_me(text) to anon, authenticated;

revoke execute on function public.restaurant_portal_dashboard(text) from public;
grant execute on function public.restaurant_portal_dashboard(text) to anon, authenticated;

revoke execute on function public.restaurant_portal_list_orders(text, integer) from public;
grant execute on function public.restaurant_portal_list_orders(text, integer) to anon, authenticated;

revoke execute on function public.restaurant_portal_list_support_issues(text, integer) from public;
grant execute on function public.restaurant_portal_list_support_issues(text, integer) to anon, authenticated;

revoke execute on function public.restaurant_portal_create_support_issue(text, uuid, text, text, jsonb) from public;
grant execute on function public.restaurant_portal_create_support_issue(text, uuid, text, text, jsonb) to anon, authenticated;

revoke execute on function public.admin_set_restaurant_portal_pin(uuid, text, text, text) from public;
grant execute on function public.admin_set_restaurant_portal_pin(uuid, text, text, text) to anon, authenticated;

-- Admin RPCs still require app-side admin session checks for now.
revoke execute on function public.admin_list_support_issues(text, uuid, integer) from public;
grant execute on function public.admin_list_support_issues(text, uuid, integer) to anon, authenticated;

revoke execute on function public.admin_update_support_issue(uuid, text, text, text) from public;
grant execute on function public.admin_update_support_issue(uuid, text, text, text) to anon, authenticated;

-- 5) Add status guardrail at DB level for orders.
update public.orders
set status = 'pending'
where status is null or trim(status) = '';

alter table public.orders
drop constraint if exists orders_status_check;

alter table public.orders
add constraint orders_status_check
check (status in ('pending', 'confirmed', 'purchase_done', 'out_for_delivery', 'delivered', 'invoiced', 'failed', 'rejected'));

-- 6) Query-performance indexes for high-frequency list paths.
create index if not exists idx_orders_restaurant_created_at_desc
  on public.orders (restaurant_id, created_at desc);

create index if not exists idx_orders_restaurant_order_date_created_at_desc
  on public.orders (restaurant_id, order_date, created_at desc);

create index if not exists idx_orders_restaurant_slug
  on public.orders (restaurant_slug);

create index if not exists idx_sales_payments_invoice_date_created_desc
  on public.sales_payments (invoice_id, payment_date desc, created_at desc);

-- 7) Add offset support for support issue admin inbox paging.
create or replace function public.admin_list_support_issues(
  p_status text default null,
  p_restaurant_id uuid default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_slug text,
  order_id uuid,
  issue_type text,
  note text,
  photo_data_urls jsonb,
  status text,
  resolution_note text,
  created_by text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_offset integer;
begin
  v_limit := greatest(1, least(coalesce(p_limit, 100), 500));
  v_offset := greatest(0, coalesce(p_offset, 0));

  return query
  select
    i.id,
    i.restaurant_id,
    r.name,
    r.slug,
    i.order_id,
    i.issue_type,
    i.note,
    i.photo_data_urls,
    i.status,
    i.resolution_note,
    i.created_by,
    i.created_at,
    i.updated_at,
    i.resolved_at
  from public.restaurant_support_issues i
  join public.restaurants r on r.id = i.restaurant_id
  where (nullif(trim(coalesce(p_status, '')), '') is null or i.status = trim(p_status))
    and (p_restaurant_id is null or i.restaurant_id = p_restaurant_id)
  order by i.created_at desc
  limit v_limit
  offset v_offset;
end;
$$;
