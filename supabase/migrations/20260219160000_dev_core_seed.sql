-- Dev core seed for fast local/product testing.
-- Idempotent: safe to run multiple times.

-- Restaurants
insert into public.restaurants (name, slug, is_active)
values
  ('Test Kitchen', 'test-kitchen', true),
  ('Spice Garden', 'spice-garden', true),
  ('Cafe Metro', 'cafe-metro', true)
on conflict (slug) do update
set
  name = excluded.name,
  is_active = excluded.is_active;

-- App users
insert into public.app_users (name, username, password, role, is_active)
values
  ('Admin User', 'admin', 'admin123', 'admin', true),
  ('Purchase User', 'purchase', 'purchase123', 'purchase', true),
  ('Sales User', 'sales', 'sales123', 'sales', true)
on conflict (username) do update
set
  name = excluded.name,
  password = excluded.password,
  role = excluded.role,
  is_active = excluded.is_active;

-- Basic item availability
insert into public.item_availability (item_code, item_en, is_in_stock, icon_url, updated_at)
values
  ('VEG_TOMATO', 'Tomato', true, null, now()),
  ('VEG_LEMON', 'Lemon', true, null, now()),
  ('CARROT', 'Carrot', true, null, now()),
  ('BEANS', 'Beans', true, null, now()),
  ('BITTER_GOURD', 'Bitter Gourd', true, null, now())
on conflict (item_en) do update
set
  item_code = excluded.item_code,
  is_in_stock = excluded.is_in_stock,
  icon_url = excluded.icon_url,
  updated_at = now();

-- Orders (mix of delivered + confirmed)
with r as (
  select id, slug, name from public.restaurants where slug in ('test-kitchen', 'spice-garden', 'cafe-metro')
)
insert into public.orders (
  order_ref,
  restaurant_id,
  restaurant_name,
  restaurant_slug,
  contact_name,
  contact_phone,
  order_date,
  delivery_date,
  items,
  notes,
  status,
  created_at,
  updated_at
)
values
  (
    'ORD-260219-1001',
    (select id from r where slug = 'test-kitchen'),
    (select name from r where slug = 'test-kitchen'),
    'test-kitchen',
    'Rahul',
    '9000000001',
    current_date,
    current_date,
    '[
      {"code":"VEG_TOMATO","en":"Tomato","hi":"टमाटर","qty":6,"category":"vegetables"},
      {"code":"VEG_LEMON","en":"Lemon","hi":"नींबू","qty":3,"category":"vegetables"}
    ]'::jsonb,
    'Seed delivered order 1',
    'delivered',
    now(),
    now()
  ),
  (
    'ORD-260219-1002',
    (select id from r where slug = 'test-kitchen'),
    (select name from r where slug = 'test-kitchen'),
    'test-kitchen',
    'Rahul',
    '9000000001',
    current_date,
    current_date,
    '[
      {"code":"VEG_TOMATO","en":"Tomato","hi":"टमाटर","qty":4,"category":"vegetables"},
      {"code":"CARROT","en":"Carrot","hi":"गाजर","qty":5,"category":"vegetables"}
    ]'::jsonb,
    'Seed delivered order 2',
    'delivered',
    now(),
    now()
  ),
  (
    'ORD-260219-1003',
    (select id from r where slug = 'spice-garden'),
    (select name from r where slug = 'spice-garden'),
    'spice-garden',
    'Amit',
    '9000000002',
    current_date,
    current_date,
    '[
      {"code":"BEANS","en":"Beans","hi":"बीन्स","qty":5,"category":"vegetables"},
      {"code":"BITTER_GOURD","en":"Bitter Gourd","hi":"करेला","qty":4,"category":"vegetables"}
    ]'::jsonb,
    'Seed confirmed order for purchase flow',
    'confirmed',
    now(),
    now()
  ),
  (
    'ORD-260219-1004',
    (select id from r where slug = 'cafe-metro'),
    (select name from r where slug = 'cafe-metro'),
    'cafe-metro',
    'Neha',
    '9000000003',
    current_date,
    current_date,
    '[
      {"code":"CARROT","en":"Carrot","hi":"गाजर","qty":2,"category":"vegetables"},
      {"code":"VEG_LEMON","en":"Lemon","hi":"नींबू","qty":2,"category":"vegetables"}
    ]'::jsonb,
    'Second confirmed order',
    'confirmed',
    now(),
    now()
  )
on conflict (order_ref) do update
set
  restaurant_id = excluded.restaurant_id,
  restaurant_name = excluded.restaurant_name,
  restaurant_slug = excluded.restaurant_slug,
  contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone,
  order_date = excluded.order_date,
  delivery_date = excluded.delivery_date,
  items = excluded.items,
  notes = excluded.notes,
  status = excluded.status,
  updated_at = now();

-- Purchase draft rows for today
insert into public.purchase_plans (
  purchase_date, item_code, item_en, item_hi, category,
  ordered_qty, adjustment_qty, final_qty, purchased_qty,
  unit_price, line_total, pack_size, pack_count, variance_qty,
  vendor_name, purchase_status, notes, source_orders, updated_at
)
values
  (current_date, 'VEG_TOMATO', 'Tomato', 'टमाटर', 'vegetables', 10, 0, 10, 8, 32, 256, 0, 0, -2, 'Mandi A', 'draft', 'seed draft tomato', null, now()),
  (current_date, 'VEG_LEMON', 'Lemon', 'नींबू', 'vegetables', 5, 0, 5, 5, 50, 250, 0, 0, 0, 'Mandi B', 'draft', null, null, now()),
  (current_date, 'CARROT', 'Carrot', 'गाजर', 'vegetables', 7, 0, 7, 6, 28, 168, 0, 0, -1, 'Mandi A', 'draft', null, null, now()),
  (current_date, 'BEANS', 'Beans', 'बीन्स', 'vegetables', 5, 0, 5, 0, 0, 0, 0, 0, -5, null, 'draft', null, null, now()),
  (current_date, 'BITTER_GOURD', 'Bitter Gourd', 'करेला', 'vegetables', 4, 0, 4, 0, 0, 0, 0, 0, -4, null, 'draft', null, null, now())
on conflict (purchase_date, item_code) do update
set
  item_en = excluded.item_en,
  item_hi = excluded.item_hi,
  category = excluded.category,
  ordered_qty = excluded.ordered_qty,
  adjustment_qty = excluded.adjustment_qty,
  final_qty = excluded.final_qty,
  purchased_qty = excluded.purchased_qty,
  unit_price = excluded.unit_price,
  line_total = excluded.line_total,
  pack_size = excluded.pack_size,
  pack_count = excluded.pack_count,
  variance_qty = excluded.variance_qty,
  vendor_name = excluded.vendor_name,
  purchase_status = excluded.purchase_status,
  notes = excluded.notes,
  source_orders = excluded.source_orders,
  updated_at = now();

insert into public.purchase_day_locks (purchase_date, is_locked, locked_at, locked_by, updated_at)
values (current_date, false, null, null, now())
on conflict (purchase_date) do update
set is_locked = excluded.is_locked, updated_at = now();

-- Purchase finalized rows for previous day
insert into public.purchase_plans (
  purchase_date, item_code, item_en, item_hi, category,
  ordered_qty, adjustment_qty, final_qty, purchased_qty,
  unit_price, line_total, pack_size, pack_count, variance_qty,
  vendor_name, purchase_status, finalized_at, finalized_by, notes, source_orders, updated_at
)
values
  (current_date - 1, 'VEG_TOMATO', 'Tomato', 'टमाटर', 'vegetables', 12, 0, 12, 13, 30, 390, 0, 0, 1, 'Mandi A', 'finalized', now(), 'admin', 'seed finalized', null, now()),
  (current_date - 1, 'VEG_LEMON', 'Lemon', 'नींबू', 'vegetables', 4, 0, 4, 4, 48, 192, 0, 0, 0, 'Mandi B', 'finalized', now(), 'admin', null, null, now()),
  (current_date - 1, 'CARROT', 'Carrot', 'गाजर', 'vegetables', 5, 0, 5, 4, 25, 100, 0, 0, -1, 'Mandi A', 'finalized', now(), 'admin', null, null, now())
on conflict (purchase_date, item_code) do update
set
  purchased_qty = excluded.purchased_qty,
  unit_price = excluded.unit_price,
  line_total = excluded.line_total,
  variance_qty = excluded.variance_qty,
  purchase_status = excluded.purchase_status,
  finalized_at = excluded.finalized_at,
  finalized_by = excluded.finalized_by,
  updated_at = now();

insert into public.purchase_day_locks (purchase_date, is_locked, locked_at, locked_by, updated_at)
values (current_date - 1, true, now(), 'admin', now())
on conflict (purchase_date) do update
set
  is_locked = excluded.is_locked,
  locked_at = excluded.locked_at,
  locked_by = excluded.locked_by,
  updated_at = now();

-- Sales seed: create one invoice from two delivered orders of same restaurant.
do $$
declare
  v_order_ids uuid[];
  v_invoice_id uuid;
begin
  select array_agg(o.id order by o.order_ref)
  into v_order_ids
  from public.orders o
  where o.order_ref in ('ORD-260219-1001', 'ORD-260219-1002');

  if v_order_ids is null or array_length(v_order_ids, 1) <> 2 then
    raise exception 'Seed orders not found for invoice creation.';
  end if;

  if not exists (
    select 1
    from public.sales_invoice_orders sio
    where sio.order_id = any(v_order_ids)
  ) then
    v_invoice_id := public.create_invoice_from_orders(v_order_ids);

    update public.sales_invoice_lines
    set
      unit_price = case item_code
        when 'VEG_TOMATO' then 42
        when 'VEG_LEMON' then 65
        when 'CARROT' then 35
        else unit_price
      end,
      line_total = round(qty * case item_code
        when 'VEG_TOMATO' then 42
        when 'VEG_LEMON' then 65
        when 'CARROT' then 35
        else unit_price
      end, 2),
      updated_at = now()
    where invoice_id = v_invoice_id;

    perform public.update_invoice_totals(v_invoice_id);
    perform public.add_payment(v_invoice_id, 500, 'cash', 'seed payment', current_date);
  end if;
end $$;
