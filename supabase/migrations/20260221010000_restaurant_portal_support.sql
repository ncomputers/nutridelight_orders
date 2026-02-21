create extension if not exists pgcrypto;

create table if not exists public.restaurant_portal_users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references public.restaurants(id) on delete cascade,
  username text not null unique,
  pin_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists idx_restaurant_portal_users_username on public.restaurant_portal_users (username);
create index if not exists idx_restaurant_portal_users_restaurant on public.restaurant_portal_users (restaurant_id);

create table if not exists public.restaurant_portal_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.restaurant_portal_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  user_agent text
);

create index if not exists idx_restaurant_portal_sessions_token_hash on public.restaurant_portal_sessions (token_hash);
create index if not exists idx_restaurant_portal_sessions_user_id on public.restaurant_portal_sessions (user_id);
create index if not exists idx_restaurant_portal_sessions_expires_at on public.restaurant_portal_sessions (expires_at);

create table if not exists public.restaurant_support_issues (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  issue_type text not null check (issue_type in ('missing_item','damaged','quality','billing','other')),
  note text not null,
  photo_data_urls jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','in_review','resolved')),
  resolution_note text,
  created_by text not null default 'restaurant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_restaurant_support_issues_restaurant_created on public.restaurant_support_issues (restaurant_id, created_at desc);
create index if not exists idx_restaurant_support_issues_status_created on public.restaurant_support_issues (status, created_at desc);

alter table public.restaurant_portal_users enable row level security;
alter table public.restaurant_portal_sessions enable row level security;
alter table public.restaurant_support_issues enable row level security;

drop policy if exists "public read restaurant portal users" on public.restaurant_portal_users;
create policy "public read restaurant portal users"
  on public.restaurant_portal_users for select using (true);

drop policy if exists "public write restaurant portal users" on public.restaurant_portal_users;
create policy "public write restaurant portal users"
  on public.restaurant_portal_users for all using (true) with check (true);

drop policy if exists "public read restaurant portal sessions" on public.restaurant_portal_sessions;
create policy "public read restaurant portal sessions"
  on public.restaurant_portal_sessions for select using (true);

drop policy if exists "public write restaurant portal sessions" on public.restaurant_portal_sessions;
create policy "public write restaurant portal sessions"
  on public.restaurant_portal_sessions for all using (true) with check (true);

drop policy if exists "public read restaurant support issues" on public.restaurant_support_issues;
create policy "public read restaurant support issues"
  on public.restaurant_support_issues for select using (true);

drop policy if exists "public write restaurant support issues" on public.restaurant_support_issues;
create policy "public write restaurant support issues"
  on public.restaurant_support_issues for all using (true) with check (true);

create or replace function public._restaurant_portal_session_context(p_session_token text)
returns table (
  session_id uuid,
  user_id uuid,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_slug text,
  username text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_hash text;
begin
  if nullif(trim(coalesce(p_session_token, '')), '') is null then
    raise exception 'RPT401_INVALID_SESSION';
  end if;

  v_token_hash := encode(digest(trim(p_session_token), 'sha256'), 'hex');

  return query
  select
    s.id,
    u.id,
    u.restaurant_id,
    r.name,
    r.slug,
    u.username
  from public.restaurant_portal_sessions s
  join public.restaurant_portal_users u on u.id = s.user_id
  join public.restaurants r on r.id = u.restaurant_id
  where s.token_hash = v_token_hash
    and s.revoked_at is null
    and s.expires_at > now()
    and u.is_active = true
    and coalesce(r.is_active, true) = true
  limit 1;

  if not found then
    raise exception 'RPT401_INVALID_SESSION';
  end if;

  update public.restaurant_portal_sessions
  set last_seen_at = now()
  where token_hash = v_token_hash;
end;
$$;

create or replace function public.admin_set_restaurant_portal_pin(
  p_restaurant_id uuid,
  p_username text,
  p_pin text,
  p_actor text default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_existing uuid;
  v_row public.restaurant_portal_users%rowtype;
begin
  if p_restaurant_id is null then
    raise exception 'RPT400_RESTAURANT_REQUIRED';
  end if;

  v_username := lower(trim(coalesce(p_username, '')));
  if v_username = '' then
    raise exception 'RPT400_USERNAME_REQUIRED';
  end if;

  if trim(coalesce(p_pin, '')) !~ '^[0-9]{4,6}$' then
    raise exception 'RPT400_PIN_INVALID';
  end if;

  select restaurant_id
  into v_existing
  from public.restaurant_portal_users
  where username = v_username
  limit 1;

  if v_existing is not null and v_existing <> p_restaurant_id then
    raise exception 'RPT409_USERNAME_IN_USE';
  end if;

  insert into public.restaurant_portal_users (
    restaurant_id,
    username,
    pin_hash,
    is_active,
    updated_at
  ) values (
    p_restaurant_id,
    v_username,
    crypt(trim(p_pin), gen_salt('bf')),
    true,
    now()
  )
  on conflict (restaurant_id) do update
  set
    username = excluded.username,
    pin_hash = excluded.pin_hash,
    is_active = true,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'restaurant_id', v_row.restaurant_id,
    'username', v_row.username,
    'updated_at', v_row.updated_at,
    'actor', coalesce(nullif(trim(coalesce(p_actor, '')), ''), 'admin')
  );
end;
$$;

create or replace function public.restaurant_portal_login(
  p_username text,
  p_pin text,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.restaurant_portal_users%rowtype;
  v_restaurant public.restaurants%rowtype;
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
begin
  select * into v_user
  from public.restaurant_portal_users
  where username = lower(trim(coalesce(p_username, '')))
    and is_active = true
  limit 1;

  if not found then
    raise exception 'RPT401_INVALID_CREDENTIALS';
  end if;

  if crypt(trim(coalesce(p_pin, '')), v_user.pin_hash) <> v_user.pin_hash then
    raise exception 'RPT401_INVALID_CREDENTIALS';
  end if;

  select * into v_restaurant
  from public.restaurants
  where id = v_user.restaurant_id
    and coalesce(is_active, true) = true
  limit 1;

  if not found then
    raise exception 'RPT403_RESTAURANT_INACTIVE';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + interval '30 days';

  insert into public.restaurant_portal_sessions (
    user_id,
    token_hash,
    expires_at,
    last_seen_at,
    user_agent
  ) values (
    v_user.id,
    v_token_hash,
    v_expires_at,
    now(),
    nullif(trim(coalesce(p_user_agent, '')), '')
  );

  update public.restaurant_portal_users
  set last_login_at = now(), updated_at = now()
  where id = v_user.id;

  return jsonb_build_object(
    'session_token', v_token,
    'expires_at', v_expires_at,
    'restaurant_id', v_restaurant.id,
    'restaurant_name', v_restaurant.name,
    'restaurant_slug', v_restaurant.slug,
    'username', v_user.username
  );
end;
$$;

create or replace function public.restaurant_portal_logout(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_hash text;
begin
  if nullif(trim(coalesce(p_session_token, '')), '') is null then
    return jsonb_build_object('ok', true);
  end if;

  v_token_hash := encode(digest(trim(p_session_token), 'sha256'), 'hex');
  update public.restaurant_portal_sessions
  set revoked_at = now(), last_seen_at = now()
  where token_hash = v_token_hash
    and revoked_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.restaurant_portal_me(p_session_token text)
returns table (
  restaurant_id uuid,
  restaurant_name text,
  restaurant_slug text,
  username text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
begin
  select * into v_ctx
  from public._restaurant_portal_session_context(p_session_token)
  limit 1;

  return query
  select
    v_ctx.restaurant_id,
    v_ctx.restaurant_name,
    v_ctx.restaurant_slug,
    v_ctx.username,
    s.expires_at
  from public.restaurant_portal_sessions s
  where s.id = v_ctx.session_id;
end;
$$;

create or replace function public.restaurant_portal_dashboard(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_today_order_ref text;
  v_today_status text;
  v_today_delivery_date date;
  v_last_order_ref text;
  v_open_issue_count integer := 0;
  v_recent_order_count integer := 0;
begin
  select * into v_ctx
  from public._restaurant_portal_session_context(p_session_token)
  limit 1;

  select o.order_ref, o.status, o.delivery_date
  into v_today_order_ref, v_today_status, v_today_delivery_date
  from public.orders o
  where o.restaurant_id = v_ctx.restaurant_id
    and o.order_date = current_date
  order by o.created_at desc
  limit 1;

  select o.order_ref
  into v_last_order_ref
  from public.orders o
  where o.restaurant_id = v_ctx.restaurant_id
  order by o.created_at desc
  limit 1;

  select count(*)::int into v_open_issue_count
  from public.restaurant_support_issues i
  where i.restaurant_id = v_ctx.restaurant_id
    and i.status <> 'resolved';

  select count(*)::int into v_recent_order_count
  from public.orders o
  where o.restaurant_id = v_ctx.restaurant_id
    and o.created_at >= now() - interval '30 days';

  return jsonb_build_object(
    'today_order_ref', v_today_order_ref,
    'today_status', v_today_status,
    'delivery_date', v_today_delivery_date,
    'last_order_ref', v_last_order_ref,
    'open_issue_count', v_open_issue_count,
    'recent_order_count_30d', v_recent_order_count
  );
end;
$$;

create or replace function public.restaurant_portal_list_orders(
  p_session_token text,
  p_limit integer default 10
)
returns table (
  id uuid,
  order_ref text,
  order_date date,
  delivery_date date,
  status text,
  items jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_limit integer;
begin
  select * into v_ctx
  from public._restaurant_portal_session_context(p_session_token)
  limit 1;

  v_limit := greatest(1, least(coalesce(p_limit, 10), 50));

  return query
  select
    o.id,
    o.order_ref,
    o.order_date,
    o.delivery_date,
    o.status,
    o.items,
    o.created_at
  from public.orders o
  where o.restaurant_id = v_ctx.restaurant_id
  order by o.created_at desc
  limit v_limit;
end;
$$;

create or replace function public.restaurant_portal_list_support_issues(
  p_session_token text,
  p_limit integer default 20
)
returns table (
  id uuid,
  restaurant_id uuid,
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
  v_ctx record;
  v_limit integer;
begin
  select * into v_ctx
  from public._restaurant_portal_session_context(p_session_token)
  limit 1;

  v_limit := greatest(1, least(coalesce(p_limit, 20), 100));

  return query
  select
    i.id,
    i.restaurant_id,
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
  where i.restaurant_id = v_ctx.restaurant_id
  order by i.created_at desc
  limit v_limit;
end;
$$;

create or replace function public.restaurant_portal_create_support_issue(
  p_session_token text,
  p_order_id uuid default null,
  p_issue_type text default 'other',
  p_note text default '',
  p_photo_data_urls jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_order_exists boolean;
  v_issue_id uuid;
  v_photos jsonb;
begin
  select * into v_ctx
  from public._restaurant_portal_session_context(p_session_token)
  limit 1;

  if coalesce(trim(p_issue_type), '') not in ('missing_item','damaged','quality','billing','other') then
    raise exception 'RPT400_ISSUE_TYPE_INVALID';
  end if;

  if nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'RPT400_NOTE_REQUIRED';
  end if;

  v_photos := coalesce(p_photo_data_urls, '[]'::jsonb);
  if jsonb_typeof(v_photos) <> 'array' then
    raise exception 'RPT400_PHOTO_ARRAY_INVALID';
  end if;
  if jsonb_array_length(v_photos) > 3 then
    raise exception 'RPT400_TOO_MANY_PHOTOS';
  end if;

  if p_order_id is not null then
    select exists (
      select 1
      from public.orders o
      where o.id = p_order_id
        and o.restaurant_id = v_ctx.restaurant_id
    ) into v_order_exists;

    if not v_order_exists then
      raise exception 'RPT403_ORDER_NOT_ALLOWED';
    end if;
  end if;

  insert into public.restaurant_support_issues (
    restaurant_id,
    order_id,
    issue_type,
    note,
    photo_data_urls,
    status,
    created_by,
    updated_at
  ) values (
    v_ctx.restaurant_id,
    p_order_id,
    trim(p_issue_type),
    trim(p_note),
    v_photos,
    'open',
    'restaurant',
    now()
  ) returning id into v_issue_id;

  return jsonb_build_object('id', v_issue_id, 'status', 'open');
end;
$$;

create or replace function public.admin_list_support_issues(
  p_status text default null,
  p_restaurant_id uuid default null,
  p_limit integer default 100
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
begin
  v_limit := greatest(1, least(coalesce(p_limit, 100), 500));

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
  limit v_limit;
end;
$$;

create or replace function public.admin_update_support_issue(
  p_issue_id uuid,
  p_status text,
  p_resolution_note text default null,
  p_actor text default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_row public.restaurant_support_issues%rowtype;
begin
  if p_issue_id is null then
    raise exception 'RPT400_ISSUE_ID_REQUIRED';
  end if;

  v_status := trim(coalesce(p_status, ''));
  if v_status not in ('open','in_review','resolved') then
    raise exception 'RPT400_STATUS_INVALID';
  end if;

  update public.restaurant_support_issues
  set
    status = v_status,
    resolution_note = case
      when v_status = 'resolved' then nullif(trim(coalesce(p_resolution_note, '')), '')
      else resolution_note
    end,
    resolved_at = case when v_status = 'resolved' then now() else null end,
    updated_at = now(),
    created_by = coalesce(nullif(trim(coalesce(p_actor, '')), ''), created_by)
  where id = p_issue_id
  returning * into v_row;

  if not found then
    raise exception 'RPT404_ISSUE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'resolved_at', v_row.resolved_at,
    'updated_at', v_row.updated_at
  );
end;
$$;
