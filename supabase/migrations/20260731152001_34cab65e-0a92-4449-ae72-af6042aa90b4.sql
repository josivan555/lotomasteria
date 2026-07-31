ALTER TABLE public.user_credits ALTER COLUMN balance TYPE numeric(12,2);
ALTER TABLE public.credit_transactions ALTER COLUMN amount TYPE numeric(12,2);

DROP FUNCTION IF EXISTS public.consume_credits(uuid, integer, text);

CREATE OR REPLACE FUNCTION public.consume_credits(_user_id uuid, _amount numeric, _description text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE novo numeric;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  INSERT INTO public.user_credits (user_id, balance) VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_credits SET balance = balance - _amount
  WHERE user_id = _user_id AND balance >= _amount
  RETURNING balance INTO novo;
  IF novo IS NULL THEN RAISE EXCEPTION 'insufficient_credits'; END IF;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
  VALUES (_user_id, -_amount, 'consumption', _description);
  RETURN novo;
END; $function$;

CREATE OR REPLACE FUNCTION public.grant_initial_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, balance) VALUES (NEW.id, 2)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
  VALUES (NEW.id, 2, 'bonus', 'Créditos de boas-vindas');
  RETURN NEW;
END; $function$;