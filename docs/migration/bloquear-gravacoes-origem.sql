-- EXECUTADO após autorização específica do proprietário em 23/10/2026. Somente origem syniwjbzskbeejgghhrw.
-- Impede gravações nas tabelas do sistema e de contas; não exclui dados.
-- Reversão em reativar-gravacoes-origem.sql. Não executar no destino.
BEGIN;
CREATE FUNCTION public.lotomaster_migration_readonly_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'O sistema foi migrado. Atualize a página para continuar.';
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.lotomaster_migration_readonly_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.bolao_participantes FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.boloes FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.comentarios_contato FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.concursos FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.credit_orders FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.credit_transactions FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.jogos_salvos FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.loterias FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.notifications FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.profiles FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.user_credits FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.user_roles FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON auth.users FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
CREATE TRIGGER lotomaster_migration_readonly BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON auth.identities FOR EACH STATEMENT EXECUTE FUNCTION public.lotomaster_migration_readonly_guard();
COMMIT;
