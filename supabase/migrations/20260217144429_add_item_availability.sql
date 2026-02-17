CREATE TABLE public.item_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_en TEXT UNIQUE NOT NULL,
  is_in_stock BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.item_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read item availability"
ON public.item_availability
FOR SELECT
USING (true);

CREATE POLICY "public insert item availability"
ON public.item_availability
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update item availability"
ON public.item_availability
FOR UPDATE
USING (true);
