DROP POLICY IF EXISTS "Inserção pública de participantes" ON public.bolao_participantes;
DROP POLICY IF EXISTS "Leitura de próprias reservas por código" ON public.bolao_participantes;

REVOKE INSERT, UPDATE, DELETE ON public.bolao_participantes FROM anon, authenticated;
REVOKE SELECT ON public.bolao_participantes FROM anon;
GRANT SELECT ON public.bolao_participantes TO authenticated;
GRANT ALL ON public.bolao_participantes TO service_role;

CREATE POLICY "Usuarios veem suas proprias reservas"
ON public.bolao_participantes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

REVOKE ALL ON FUNCTION public.apply_paid_order(uuid, text) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.consume_credits(uuid, numeric, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.apply_paid_order(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, numeric, text) TO service_role;