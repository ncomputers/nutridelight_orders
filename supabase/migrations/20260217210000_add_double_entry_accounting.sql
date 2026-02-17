CREATE TABLE IF NOT EXISTS public.account_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  ledger_group TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'expense', 'income', 'equity')),
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_ledgers_group ON public.account_ledgers (ledger_group);

ALTER TABLE public.account_ledgers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read account ledgers"
ON public.account_ledgers
FOR SELECT
USING (true);

CREATE POLICY "public insert account ledgers"
ON public.account_ledgers
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update account ledgers"
ON public.account_ledgers
FOR UPDATE
USING (true);

CREATE TABLE IF NOT EXISTS public.purchase_user_ledger_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  ledger_id UUID NOT NULL REFERENCES public.account_ledgers(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_user_ledger_map_ledger ON public.purchase_user_ledger_map (ledger_id);

ALTER TABLE public.purchase_user_ledger_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read purchase user ledger map"
ON public.purchase_user_ledger_map
FOR SELECT
USING (true);

CREATE POLICY "public insert purchase user ledger map"
ON public.purchase_user_ledger_map
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update purchase user ledger map"
ON public.purchase_user_ledger_map
FOR UPDATE
USING (true);

CREATE TABLE IF NOT EXISTS public.journal_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no TEXT UNIQUE NOT NULL,
  voucher_date DATE NOT NULL,
  voucher_type TEXT NOT NULL CHECK (voucher_type IN ('opening', 'cash_issue', 'purchase', 'cash_return', 'adjustment', 'reversal')),
  voucher_amount NUMERIC NOT NULL DEFAULT 0 CHECK (voucher_amount >= 0),
  narration TEXT,
  source_type TEXT,
  source_id TEXT,
  posted_by TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  reversed_at TIMESTAMPTZ,
  reversed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, voucher_type)
);

CREATE INDEX IF NOT EXISTS idx_journal_vouchers_date_desc ON public.journal_vouchers (voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_vouchers_source ON public.journal_vouchers (source_type, source_id);

ALTER TABLE public.journal_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read journal vouchers"
ON public.journal_vouchers
FOR SELECT
USING (true);

CREATE POLICY "public insert journal vouchers"
ON public.journal_vouchers
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update journal vouchers"
ON public.journal_vouchers
FOR UPDATE
USING (true);

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.journal_vouchers(id) ON DELETE CASCADE,
  ledger_id UUID NOT NULL REFERENCES public.account_ledgers(id) ON DELETE RESTRICT,
  dr_amount NUMERIC NOT NULL DEFAULT 0 CHECK (dr_amount >= 0),
  cr_amount NUMERIC NOT NULL DEFAULT 0 CHECK (cr_amount >= 0),
  line_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (dr_amount > 0 AND cr_amount = 0)
    OR (cr_amount > 0 AND dr_amount = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_voucher ON public.journal_lines (voucher_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_ledger ON public.journal_lines (ledger_id);

ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read journal lines"
ON public.journal_lines
FOR SELECT
USING (true);

CREATE POLICY "public insert journal lines"
ON public.journal_lines
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update journal lines"
ON public.journal_lines
FOR UPDATE
USING (true);

INSERT INTO public.account_ledgers (code, name, ledger_group, account_type, is_system)
VALUES
  ('CASH_ON_HAND', 'Cash On Hand', 'cash', 'asset', true),
  ('INVENTORY_RAW', 'Inventory Raw Material', 'inventory', 'asset', true),
  ('PURCHASE_ADVANCE_UNMAPPED', 'Purchase Advance (Unmapped)', 'advance', 'asset', true),
  ('OPENING_DIFFERENCE', 'Opening Difference', 'equity', 'equity', true)
ON CONFLICT (code) DO NOTHING;
