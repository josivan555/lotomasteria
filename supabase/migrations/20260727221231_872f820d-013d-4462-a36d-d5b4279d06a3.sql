
CREATE TABLE public.concursos (
  numero INTEGER PRIMARY KEY,
  data_apuracao DATE NOT NULL,
  dezenas SMALLINT[] NOT NULL,
  soma INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.concursos TO anon, authenticated;
GRANT ALL ON public.concursos TO service_role;
ALTER TABLE public.concursos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concursos are readable by anyone" ON public.concursos FOR SELECT USING (true);
CREATE INDEX idx_concursos_data ON public.concursos(data_apuracao DESC);

CREATE TABLE public.jogos_salvos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  dezenas SMALLINT[] NOT NULL,
  score NUMERIC(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jogos_salvos TO authenticated;
GRANT ALL ON public.jogos_salvos TO service_role;
ALTER TABLE public.jogos_salvos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage their own saved games" ON public.jogos_salvos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_jogos_salvos_user ON public.jogos_salvos(user_id, created_at DESC);

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
