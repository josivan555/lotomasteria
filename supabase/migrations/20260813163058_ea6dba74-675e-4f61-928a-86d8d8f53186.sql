ALTER TABLE public.boloes ADD COLUMN IF NOT EXISTS horario_encerramento TIME DEFAULT '20:00:00';

-- Garantir que as permissões continuem corretas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boloes TO authenticated;
GRANT SELECT ON public.boloes TO anon;
GRANT ALL ON public.boloes TO service_role;