ALTER TABLE public.item_availability
ADD COLUMN IF NOT EXISTS item_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS item_availability_item_code_unique
ON public.item_availability(item_code)
WHERE item_code IS NOT NULL;
