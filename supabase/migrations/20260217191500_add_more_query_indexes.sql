-- Extra index path for purchase history query:
-- where purchase_status='finalized' and purchase_date range ordered by purchase_date desc
create index if not exists idx_purchase_plans_status_date_desc
  on public.purchase_plans (purchase_status, purchase_date desc);

-- Helps recent-first order list operations.
create index if not exists idx_orders_created_at_desc
  on public.orders (created_at desc);
