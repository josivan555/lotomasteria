CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own credits" ON public.user_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('bonus','purchase','consumption','adjustment')),
  description text,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_transactions_user_idx ON public.credit_transactions(user_id, created_at DESC);
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own transactions" ON public.credit_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.credit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  amount_brl numeric(10,2) NOT NULL CHECK (amount_brl > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','cancelled')),
  preference_id text,
  payment_id text UNIQUE,
  init_point text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_orders_user_idx ON public.credit_orders(user_id, created_at DESC);
GRANT SELECT ON public.credit_orders TO authenticated;
GRANT ALL ON public.credit_orders TO service_role;
ALTER TABLE public.credit_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own orders" ON public.credit_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER user_credits_updated_at BEFORE UPDATE ON public.user_credits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER credit_orders_updated_at BEFORE UPDATE ON public.credit_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bônus inicial de 5 créditos
CREATE OR REPLACE FUNCTION public.grant_initial_credits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance) VALUES (NEW.id, 5)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
  VALUES (NEW.id, 5, 'bonus', 'Créditos de boas-vindas');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_initial_credits();

-- débito atômico
CREATE OR REPLACE FUNCTION public.consume_credits(_user_id uuid, _amount integer, _description text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE novo integer;
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
END; $$;
REVOKE ALL ON FUNCTION public.consume_credits(uuid, integer, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, integer, text) TO service_role;

-- crédito idempotente de compra
CREATE OR REPLACE FUNCTION public.apply_paid_order(_order_id uuid, _payment_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.credit_orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.credit_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF o.status = 'paid' THEN RETURN false; END IF;
  UPDATE public.credit_orders SET status = 'paid', payment_id = _payment_id WHERE id = _order_id;
  INSERT INTO public.user_credits (user_id, balance) VALUES (o.user_id, o.credits)
  ON CONFLICT (user_id) DO UPDATE SET balance = public.user_credits.balance + o.credits;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description, order_id)
  VALUES (o.user_id, o.credits, 'purchase', 'Compra de ' || o.credits || ' créditos', o.id);
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.apply_paid_order(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_paid_order(uuid, text) TO service_role;

-- concede bônus a usuários já existentes
INSERT INTO public.user_credits (user_id, balance)
SELECT id, 5 FROM auth.users ON CONFLICT (user_id) DO NOTHING;