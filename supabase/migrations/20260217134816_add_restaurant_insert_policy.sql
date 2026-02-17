-- Allow restaurant creation from the frontend admin panel.
-- NOTE: This mirrors the current public-access pattern in this project.
CREATE POLICY "public insert restaurants"
ON public.restaurants
FOR INSERT
WITH CHECK (true);
