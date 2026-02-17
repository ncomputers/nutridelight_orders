CREATE TABLE IF NOT EXISTS public.purchase_day_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_date DATE UNIQUE NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  reopened_at TIMESTAMPTZ,
  reopened_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.purchase_day_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read purchase day locks"
ON public.purchase_day_locks
FOR SELECT
USING (true);

CREATE POLICY "public insert purchase day locks"
ON public.purchase_day_locks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update purchase day locks"
ON public.purchase_day_locks
FOR UPDATE
USING (true);
