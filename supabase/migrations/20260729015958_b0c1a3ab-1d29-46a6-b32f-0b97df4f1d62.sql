
-- 1. Catálogo de loterias
CREATE TABLE public.loterias (
  id text PRIMARY KEY,
  nome text NOT NULL,
  total_numeros int NOT NULL,
  tamanho_jogo int NOT NULL,
  cor_tema text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loterias TO anon, authenticated;
GRANT ALL ON public.loterias TO service_role;

ALTER TABLE public.loterias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loterias legiveis por todos"
  ON public.loterias FOR SELECT
  USING (true);

INSERT INTO public.loterias (id, nome, total_numeros, tamanho_jogo, cor_tema, ordem) VALUES
  ('lotofacil', 'Lotofácil', 25, 15, '#22c55e', 1),
  ('megasena',  'Mega-Sena', 60, 6,  '#0ea5e9', 2),
  ('quina',     'Quina',     80, 5,  '#a855f7', 3);

-- 2. Concursos: adicionar coluna loteria e mudar PK para (loteria, numero)
ALTER TABLE public.concursos
  ADD COLUMN IF NOT EXISTS loteria text NOT NULL DEFAULT 'lotofacil'
  REFERENCES public.loterias(id) ON UPDATE CASCADE;

ALTER TABLE public.concursos DROP CONSTRAINT IF EXISTS concursos_pkey;
ALTER TABLE public.concursos ADD PRIMARY KEY (loteria, numero);

CREATE INDEX IF NOT EXISTS concursos_loteria_numero_desc_idx
  ON public.concursos (loteria, numero DESC);

-- 3. Jogos salvos: adicionar coluna loteria
ALTER TABLE public.jogos_salvos
  ADD COLUMN IF NOT EXISTS loteria text NOT NULL DEFAULT 'lotofacil'
  REFERENCES public.loterias(id) ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS jogos_salvos_user_loteria_idx
  ON public.jogos_salvos (user_id, loteria, created_at DESC);
