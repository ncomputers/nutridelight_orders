
-- Restaurants table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read restaurants" ON public.restaurants FOR SELECT USING (true);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref TEXT UNIQUE,
  restaurant_id UUID REFERENCES public.restaurants(id),
  restaurant_name TEXT,
  restaurant_slug TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  order_date DATE,
  delivery_date DATE,
  items JSONB,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "public update orders" ON public.orders FOR UPDATE USING (true);

-- Seed restaurants
INSERT INTO public.restaurants (name, slug) VALUES
  ('Spice Garden Restaurant', 'spicegarden'),
  ('Hotel Anand Palace', 'anandpalace');
