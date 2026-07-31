REVOKE ALL ON public.user_credits FROM anon, authenticated;
REVOKE ALL ON public.credit_orders FROM anon, authenticated;
REVOKE ALL ON public.credit_transactions FROM anon, authenticated;

GRANT SELECT ON public.user_credits TO authenticated;
GRANT SELECT ON public.credit_orders TO authenticated;
GRANT SELECT ON public.credit_transactions TO authenticated;

GRANT ALL ON public.user_credits TO service_role;
GRANT ALL ON public.credit_orders TO service_role;
GRANT ALL ON public.credit_transactions TO service_role;