ALTER TABLE public.concursos ADD COLUMN IF NOT EXISTS especial boolean;
CREATE INDEX IF NOT EXISTS concursos_loteria_especial_idx ON public.concursos (loteria, especial);