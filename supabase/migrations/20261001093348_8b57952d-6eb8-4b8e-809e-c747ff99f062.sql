ALTER TABLE public.boloes ADD COLUMN IF NOT EXISTS capa_url text;
CREATE POLICY "Admins enviam capas" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bolao-capas' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins atualizam capas" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'bolao-capas' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins removem capas" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bolao-capas' AND public.has_role(auth.uid(), 'admin'));