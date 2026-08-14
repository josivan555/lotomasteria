ALTER TABLE public.boloes
  ADD COLUMN IF NOT EXISTS is_combo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS combo_loterias jsonb NOT NULL DEFAULT '[]'::jsonb;