CREATE TABLE public.purchase_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_date DATE NOT NULL,
  item_en TEXT NOT NULL,
  item_hi TEXT,
  category TEXT,
  ordered_qty NUMERIC NOT NULL DEFAULT 0,
  adjustment_qty NUMERIC NOT NULL DEFAULT 0,
  final_qty NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  source_orders JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (purchase_date, item_en)
);

ALTER TABLE public.purchase_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read purchase plans"
ON public.purchase_plans
FOR SELECT
USING (true);

CREATE POLICY "public insert purchase plans"
ON public.purchase_plans
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update purchase plans"
ON public.purchase_plans
FOR UPDATE
USING (true);
