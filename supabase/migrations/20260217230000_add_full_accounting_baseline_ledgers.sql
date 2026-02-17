CREATE TABLE IF NOT EXISTS public.ledger_opening_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_date DATE NOT NULL,
  ledger_id UUID NOT NULL REFERENCES public.account_ledgers(id) ON DELETE RESTRICT,
  opening_dr NUMERIC NOT NULL DEFAULT 0 CHECK (opening_dr >= 0),
  opening_cr NUMERIC NOT NULL DEFAULT 0 CHECK (opening_cr >= 0),
  note TEXT,
  created_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((opening_dr > 0 AND opening_cr = 0) OR (opening_cr > 0 AND opening_dr = 0)),
  UNIQUE (opening_date, ledger_id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_opening_balances_date
  ON public.ledger_opening_balances (opening_date DESC);

ALTER TABLE public.ledger_opening_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read ledger opening balances"
ON public.ledger_opening_balances
FOR SELECT
USING (true);

CREATE POLICY "public insert ledger opening balances"
ON public.ledger_opening_balances
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update ledger opening balances"
ON public.ledger_opening_balances
FOR UPDATE
USING (true);

INSERT INTO public.account_ledgers (code, name, ledger_group, account_type, is_system)
VALUES
  ('VENDOR_PAYABLE', 'Vendor Payable', 'payable', 'liability', true),
  ('SALES_REVENUE', 'Sales Revenue', 'revenue', 'income', true),
  ('COGS', 'Cost of Goods Sold', 'expense', 'expense', true)
ON CONFLICT (code) DO NOTHING;
