-- Clear demo/seeded data so environments stay schema-clean by default.
-- Keep app_users table intact for login continuity.

truncate table
  public.sales_payments,
  public.sales_invoice_lines,
  public.sales_invoice_orders,
  public.sales_invoices,
  public.purchase_plan_audit,
  public.purchase_finalize_runs,
  public.purchase_plans,
  public.purchase_day_locks,
  public.state_transition_audit,
  public.order_items,
  public.orders,
  public.stock_qty,
  public.item_availability,
  public.restaurants
restart identity cascade;
