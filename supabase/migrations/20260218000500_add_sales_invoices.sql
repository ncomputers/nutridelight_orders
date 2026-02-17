CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  restaurant_name TEXT NOT NULL,
  restaurant_slug TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  delivery_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'cancelled')),
  subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount NUMERIC NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  other_charges NUMERIC NOT NULL DEFAULT 0 CHECK (other_charges >= 0),
  grand_total NUMERIC NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  paid_amount NUMERIC NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_amount NUMERIC NOT NULL DEFAULT 0 CHECK (due_amount >= 0),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ,
  finalized_by TEXT,
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_date_status
  ON public.sales_invoices (invoice_date, status);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_order_id
  ON public.sales_invoices (order_id);

CREATE TABLE IF NOT EXISTS public.sales_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  item_code TEXT,
  item_en TEXT NOT NULL,
  item_hi TEXT,
  qty NUMERIC NOT NULL DEFAULT 0 CHECK (qty >= 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total NUMERIC NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  line_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_invoice_id
  ON public.sales_invoice_lines (invoice_id);

ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read sales invoices"
ON public.sales_invoices
FOR SELECT
USING (true);

CREATE POLICY "public insert sales invoices"
ON public.sales_invoices
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update sales invoices"
ON public.sales_invoices
FOR UPDATE
USING (true);

CREATE POLICY "public read sales invoice lines"
ON public.sales_invoice_lines
FOR SELECT
USING (true);

CREATE POLICY "public insert sales invoice lines"
ON public.sales_invoice_lines
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update sales invoice lines"
ON public.sales_invoice_lines
FOR UPDATE
USING (true);

INSERT INTO public.account_ledgers (code, name, ledger_group, account_type, is_system)
VALUES
  ('ACCOUNTS_RECEIVABLE', 'Accounts Receivable', 'receivable', 'asset', true),
  ('SALES_REVENUE', 'Sales Revenue', 'sales', 'income', true)
ON CONFLICT (code) DO NOTHING;
