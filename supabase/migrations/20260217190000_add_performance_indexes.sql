-- Reduce read cost for admin/purchase date-window queries.
create index if not exists idx_orders_status_delivery_date
  on public.orders (status, delivery_date);

create index if not exists idx_orders_order_date_created_at
  on public.orders (order_date, created_at desc);

create index if not exists idx_purchase_plans_purchase_date_status
  on public.purchase_plans (purchase_date, purchase_status);

create index if not exists idx_purchase_day_locks_purchase_date
  on public.purchase_day_locks (purchase_date);

create index if not exists idx_app_users_username_role_active
  on public.app_users (username, role, is_active);
