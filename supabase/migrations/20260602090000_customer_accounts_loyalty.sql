-- Customer accounts + "buy 10 beverages, get the 11th free" loyalty.
-- Customers are ordinary auth.users WITHOUT a staff/admin role; owner-scoped RLS
-- (auth.uid() = user_id) governs their access. No new app_role value is required.

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger helper (idempotent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- customer_profiles: one row per signed-up customer
-- ---------------------------------------------------------------------------
CREATE TABLE public.customer_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own profile"
  ON public.customer_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Customers can update own profile"
  ON public.customer_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all profiles"
  ON public.customer_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER customer_profiles_touch_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- loyalty_accounts: running counters per customer.
-- Customers may READ their own row; all WRITES happen via service-role edge
-- functions (which bypass RLS), so no INSERT/UPDATE policy is granted.
-- ---------------------------------------------------------------------------
CREATE TABLE public.loyalty_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  paid_beverage_count integer NOT NULL DEFAULT 0,
  free_drinks_available integer NOT NULL DEFAULT 0,
  lifetime_free_redeemed integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own loyalty account"
  ON public.loyalty_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all loyalty accounts"
  ON public.loyalty_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER loyalty_accounts_touch_updated_at
  BEFORE UPDATE ON public.loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- loyalty_events: audit log + idempotency guard. UNIQUE(order_id, type)
-- guarantees a re-run of payment verification can never double-count.
-- ---------------------------------------------------------------------------
CREATE TABLE public.loyalty_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('earn', 'redeem')),
  beverages_counted integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (order_id, type)
);

ALTER TABLE public.loyalty_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own loyalty events"
  ON public.loyalty_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all loyalty events"
  ON public.loyalty_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ---------------------------------------------------------------------------
-- orders: link to a customer account + record any loyalty free-drink discount
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loyalty_free_drink_amount numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);

CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-provision profile + loyalty rows when a new auth user is created.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_profiles (user_id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.loyalty_accounts (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer();

-- ---------------------------------------------------------------------------
-- Loyalty configuration (backend defaults only; no UI in this build).
-- ---------------------------------------------------------------------------
INSERT INTO public.kitchen_settings (setting_key, setting_value) VALUES
  ('loyalty_enabled', 'true'),
  ('loyalty_threshold', '10'),
  ('loyalty_reward_qty', '1'),
  ('loyalty_eligible_categories',
   '["coffee","cold-beverages","mojito","fresh-juice","matcha","nawa-special-tea","arabic-coffee","nawa-summer"]')
ON CONFLICT (setting_key) DO NOTHING;
