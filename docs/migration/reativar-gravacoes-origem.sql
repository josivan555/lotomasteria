-- Somente se houver rollback planejado para a origem. Reconciliar novas gravações do destino antes.
BEGIN;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.bolao_participantes;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.boloes;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.comentarios_contato;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.concursos;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.credit_orders;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.credit_transactions;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.jogos_salvos;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.loterias;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.notifications;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.profiles;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.user_credits;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON public.user_roles;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON auth.users;
DROP TRIGGER IF EXISTS lotomaster_migration_readonly ON auth.identities;
DROP FUNCTION IF EXISTS public.lotomaster_migration_readonly_guard();
COMMIT;
