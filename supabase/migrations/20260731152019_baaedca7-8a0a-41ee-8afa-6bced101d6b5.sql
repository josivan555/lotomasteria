REVOKE EXECUTE ON FUNCTION public.consume_credits(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, numeric, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.grant_initial_credits() FROM PUBLIC, anon, authenticated;