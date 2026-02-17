CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'purchase')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read app users"
ON public.app_users
FOR SELECT
USING (true);

CREATE POLICY "public insert app users"
ON public.app_users
FOR INSERT
WITH CHECK (true);

CREATE POLICY "public update app users"
ON public.app_users
FOR UPDATE
USING (true);

INSERT INTO public.app_users (name, username, password, role, is_active)
VALUES ('Default Admin', 'admin', 'admin123', 'admin', true)
ON CONFLICT (username) DO NOTHING;
