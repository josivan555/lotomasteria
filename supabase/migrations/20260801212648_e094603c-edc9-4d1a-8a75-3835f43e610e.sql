DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE lower(email) = 'informaticadojosy@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.consume_credits(_user_id uuid, _amount numeric, _description text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE novo numeric;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF public.has_role(_user_id, 'admin') THEN
    RETURN 999999999;
  END IF;
  INSERT INTO public.user_credits (user_id, balance) VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_credits SET balance = balance - _amount
  WHERE user_id = _user_id AND balance >= _amount
  RETURNING balance INTO novo;
  IF novo IS NULL THEN RAISE EXCEPTION 'insufficient_credits'; END IF;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
  VALUES (_user_id, -_amount, 'consumption', _description);
  RETURN novo;
END; $$;