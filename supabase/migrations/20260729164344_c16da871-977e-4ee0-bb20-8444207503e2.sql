GRANT SELECT, INSERT, UPDATE, DELETE ON public.jogos_salvos TO authenticated;
GRANT ALL ON public.jogos_salvos TO service_role;

GRANT SELECT ON public.concursos TO anon;
GRANT SELECT ON public.concursos TO authenticated;
GRANT ALL ON public.concursos TO service_role;

GRANT SELECT ON public.loterias TO anon;
GRANT SELECT ON public.loterias TO authenticated;
GRANT ALL ON public.loterias TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;