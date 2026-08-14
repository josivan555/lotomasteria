-- Revogar execução pública de has_role para evitar as falhas do linter
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Garantir que a tabela de notificações tenha GRANTs corretos e RLS
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
-- Anon não deve ter acesso a notificações
REVOKE ALL ON public.notifications FROM anon;
