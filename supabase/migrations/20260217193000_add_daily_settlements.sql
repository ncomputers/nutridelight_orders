CREATE TABLE IF NOT EXISTS public.daily_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_date DATE UNIQUE NOT NULL,
  cash_given_morning NUMERIC NOT NULL DEFAULT 0,
  cash_extra_used NUMERIC NOT NULL DEFAULT 0,
  cash_returned_evening NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_settlements_non_negative_cash_given CHECK (cash_given_morning >= 0),
  CONSTRAINT daily_settlements_non_negative_cash_extra CHECK (cash_extra_used >= 0),
  CONSTRAINT daily_settlements_non_negative_cash_returned CHECK (cash_returned_evening >= 0)
);

CREATE INDEX IF NOT EXISTS idx_daily_settlements_date_desc
  ON public.daily_settlements (settlement_date DESC);

ALTER TABLE public.daily_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read daily settlements"
ON public.daily_settlements
FOR SELECT
USING (true);

CREATE POLICY "public insert daily settlements"
ON public.daily_settlements
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update daily settlements"
ON public.daily_settlements
FOR UPDATE
USING (true);
