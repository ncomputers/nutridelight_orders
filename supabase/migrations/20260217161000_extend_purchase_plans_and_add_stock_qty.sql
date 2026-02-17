ALTER TABLE public.purchase_plans
ADD COLUMN IF NOT EXISTS item_code TEXT,
ADD COLUMN IF NOT EXISTS purchased_qty NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS line_total NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pack_size NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pack_count NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_qty NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS purchase_status TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS finalized_by TEXT;

ALTER TABLE public.purchase_plans
ADD CONSTRAINT purchase_plans_non_negative_purchased_qty CHECK (purchased_qty >= 0),
ADD CONSTRAINT purchase_plans_non_negative_unit_price CHECK (unit_price >= 0),
ADD CONSTRAINT purchase_plans_non_negative_line_total CHECK (line_total >= 0),
ADD CONSTRAINT purchase_plans_non_negative_pack_size CHECK (pack_size >= 0),
ADD CONSTRAINT purchase_plans_non_negative_pack_count CHECK (pack_count >= 0),
ADD CONSTRAINT purchase_plans_purchase_status_check CHECK (purchase_status IN ('draft', 'finalized'));

CREATE UNIQUE INDEX IF NOT EXISTS purchase_plans_item_code_date_unique
ON public.purchase_plans (purchase_date, item_code)
WHERE item_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.stock_qty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT UNIQUE NOT NULL,
  item_en TEXT NOT NULL,
  available_qty NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stock_qty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read stock qty"
ON public.stock_qty
FOR SELECT
USING (true);

CREATE POLICY "public insert stock qty"
ON public.stock_qty
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update stock qty"
ON public.stock_qty
FOR UPDATE
USING (true);
