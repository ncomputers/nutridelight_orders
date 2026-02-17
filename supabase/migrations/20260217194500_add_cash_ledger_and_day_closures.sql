CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_date DATE NOT NULL,
  txn_type TEXT NOT NULL CHECK (txn_type IN ('issue', 'return')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  person_name TEXT NOT NULL,
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_date_type
  ON public.cash_transactions (txn_date, txn_type);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_date_desc
  ON public.cash_transactions (txn_date DESC);

ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read cash transactions"
ON public.cash_transactions
FOR SELECT
USING (true);

CREATE POLICY "public insert cash transactions"
ON public.cash_transactions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update cash transactions"
ON public.cash_transactions
FOR UPDATE
USING (true);

CREATE TABLE IF NOT EXISTS public.accounts_day_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_date DATE UNIQUE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  close_note TEXT,
  reopened_at TIMESTAMPTZ,
  reopened_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_day_closures_date_desc
  ON public.accounts_day_closures (closure_date DESC);

ALTER TABLE public.accounts_day_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read accounts day closures"
ON public.accounts_day_closures
FOR SELECT
USING (true);

CREATE POLICY "public insert accounts day closures"
ON public.accounts_day_closures
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update accounts day closures"
ON public.accounts_day_closures
FOR UPDATE
USING (true);
