CREATE TABLE public.comentarios_contato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 2 AND 60),
  mensagem text NOT NULL CHECK (char_length(btrim(mensagem)) BETWEEN 2 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.comentarios_contato TO anon, authenticated;
GRANT ALL ON public.comentarios_contato TO service_role;
ALTER TABLE public.comentarios_contato ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem comentarios" ON public.comentarios_contato FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Todos podem comentar" ON public.comentarios_contato FOR INSERT TO anon, authenticated WITH CHECK (char_length(btrim(nome)) BETWEEN 2 AND 60 AND char_length(btrim(mensagem)) BETWEEN 2 AND 1000);
ALTER PUBLICATION supabase_realtime ADD TABLE public.comentarios_contato;