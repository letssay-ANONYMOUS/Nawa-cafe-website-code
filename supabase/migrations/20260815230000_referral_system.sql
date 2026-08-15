-- Referral system.
--
-- Every customer gets a short referral code. A new customer may claim one
-- code at signup, which records a PENDING referral. The referral only becomes
-- QUALIFIED once the referred customer completes their first paid order, so
-- fake signups cannot farm rewards. Qualified referrals grant bonus stamps
-- that feed the existing stamp card.

-- ---------------------------------------------------------------------------
-- 1. Referral codes on customer profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS referral_code text;

CREATE UNIQUE INDEX IF NOT EXISTS customer_profiles_referral_code_key
  ON public.customer_profiles (referral_code)
  WHERE referral_code IS NOT NULL;

-- Lowercase, no look-alike characters (l/o/0/1) — same alphabet as the email
-- confirmation codes so nothing is ambiguous when read aloud or typed.
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet constant text := 'abcdefghijkmnpqrstuvwxyz23456789';
  candidate text;
  i integer;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.customer_profiles WHERE referral_code = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_profiles_assign_referral_code ON public.customer_profiles;
CREATE TRIGGER customer_profiles_assign_referral_code
  BEFORE INSERT ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_referral_code();

-- Backfill existing customers.
DO $$
DECLARE
  row_profile record;
BEGIN
  FOR row_profile IN
    SELECT user_id FROM public.customer_profiles WHERE referral_code IS NULL
  LOOP
    UPDATE public.customer_profiles
    SET referral_code = public.generate_referral_code()
    WHERE user_id = row_profile.user_id;
  END LOOP;
END;
$$;

-- Customers must not be able to rewrite their own referral code either, so
-- extend the existing guard trigger's pinned columns.
CREATE OR REPLACE FUNCTION public.guard_customer_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  jwt_role text := claims ->> 'role';
BEGIN
  IF claims IS NOT NULL AND jwt_role IS DISTINCT FROM 'service_role' THEN
    NEW.email_verified_at := OLD.email_verified_at;
    NEW.user_id := OLD.user_id;
    NEW.referral_code := OLD.referral_code;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Referrals ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code_used text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  qualifying_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  qualified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_status_check CHECK (status IN ('pending', 'qualified')),
  CONSTRAINT referrals_no_self CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON public.referrals (referrer_user_id, status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Read-only for the people involved; all writes go through service-role
-- edge functions and SECURITY DEFINER helpers.
DROP POLICY IF EXISTS "Customers can view referrals they are part of" ON public.referrals;
CREATE POLICY "Customers can view referrals they are part of"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

DROP POLICY IF EXISTS "Staff can view all referrals" ON public.referrals;
CREATE POLICY "Staff can view all referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ---------------------------------------------------------------------------
-- 3. Settings
-- ---------------------------------------------------------------------------
INSERT INTO public.kitchen_settings (setting_key, setting_value)
VALUES
  ('referral_enabled', 'true'),
  ('referral_stamps_per_referral', '2'),
  ('referral_friend_stamps', '1')
ON CONFLICT (setting_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Bonus stamp calculation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.referral_bonus_stamps(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enabled boolean := true;
  per_referral integer := 2;
  friend_stamps integer := 1;
  referred_count integer := 0;
  was_referred integer := 0;
BEGIN
  SELECT
    coalesce(max(setting_value) FILTER (WHERE setting_key = 'referral_enabled'), 'true') <> 'false',
    greatest(0, coalesce(nullif(max(setting_value) FILTER (WHERE setting_key = 'referral_stamps_per_referral'), '')::integer, 2)),
    greatest(0, coalesce(nullif(max(setting_value) FILTER (WHERE setting_key = 'referral_friend_stamps'), '')::integer, 1))
  INTO enabled, per_referral, friend_stamps
  FROM public.kitchen_settings
  WHERE setting_key IN ('referral_enabled', 'referral_stamps_per_referral', 'referral_friend_stamps');

  IF NOT enabled THEN
    RETURN 0;
  END IF;

  SELECT count(*) INTO referred_count
  FROM public.referrals
  WHERE referrer_user_id = _user_id AND status = 'qualified';

  SELECT count(*) INTO was_referred
  FROM public.referrals
  WHERE referred_user_id = _user_id AND status = 'qualified';

  RETURN (referred_count * per_referral) + (was_referred * friend_stamps);
END;
$$;

-- Flip a pending referral to qualified once the referred customer has paid for
-- their first order. Returns true when a row actually transitioned.
CREATE OR REPLACE FUNCTION public.qualify_referral_for_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_paid_order uuid;
  referrer uuid;
BEGIN
  SELECT o.id INTO first_paid_order
  FROM public.orders o
  WHERE o.user_id = _user_id
    AND o.payment_status = 'paid'::public.payment_status
  ORDER BY o.created_at ASC
  LIMIT 1;

  IF first_paid_order IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.referrals
  SET status = 'qualified',
      qualified_at = now(),
      qualifying_order_id = first_paid_order
  WHERE referred_user_id = _user_id
    AND status = 'pending'
  RETURNING referrer_user_id INTO referrer;

  IF referrer IS NULL THEN
    RETURN false;
  END IF;

  -- The referrer's stamp total just changed; refresh their account. Safe from
  -- runaway recursion because a referral can only transition once.
  PERFORM public.recalculate_customer_loyalty(referrer);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.referral_bonus_stamps(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qualify_referral_for_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referral_bonus_stamps(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.qualify_referral_for_user(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Fold referral bonus stamps into the stamp card.
-- Identical to the current live definition except: it qualifies any pending
-- referral first, then adds referral bonus stamps to the earned total.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_customer_loyalty(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enabled boolean := true;
  threshold integer := 10;
  reward_qty integer := 1;
  eligible_categories text[] := ARRAY[]::text[];
  eligible_items text[] := ARRAY[]::text[];
  categories_json text;
  items_json text;
  total_paid_items integer := 0;
  redeemed_count integer := 0;
  remainder_count integer := 0;
  free_available integer := 0;
  bonus_stamps integer := 0;
BEGIN
  -- Promote a pending referral if this customer has now paid for an order.
  PERFORM public.qualify_referral_for_user(_user_id);

  SELECT
    coalesce(max(setting_value) FILTER (WHERE setting_key = 'loyalty_enabled'), 'true') <> 'false',
    greatest(1, coalesce(nullif(max(setting_value) FILTER (WHERE setting_key = 'loyalty_threshold'), '')::integer, 10)),
    greatest(1, coalesce(nullif(max(setting_value) FILTER (WHERE setting_key = 'loyalty_reward_qty'), '')::integer, 1)),
    max(setting_value) FILTER (WHERE setting_key = 'loyalty_eligible_categories'),
    max(setting_value) FILTER (WHERE setting_key = 'loyalty_eligible_items')
  INTO enabled, threshold, reward_qty, categories_json, items_json
  FROM public.kitchen_settings
  WHERE setting_key IN (
    'loyalty_enabled',
    'loyalty_threshold',
    'loyalty_reward_qty',
    'loyalty_eligible_categories',
    'loyalty_eligible_items'
  );

  BEGIN
    SELECT coalesce(array_agg(value), ARRAY[]::text[])
    INTO eligible_categories
    FROM jsonb_array_elements_text(coalesce(categories_json, '[]')::jsonb) AS entries(value);
  EXCEPTION WHEN others THEN
    eligible_categories := ARRAY[]::text[];
  END;

  BEGIN
    SELECT coalesce(array_agg(value), ARRAY[]::text[])
    INTO eligible_items
    FROM jsonb_array_elements_text(coalesce(items_json, '[]')::jsonb) AS entries(value);
  EXCEPTION WHEN others THEN
    eligible_items := ARRAY[]::text[];
  END;

  IF NOT enabled
     OR (
       coalesce(array_length(eligible_categories, 1), 0) = 0
       AND coalesce(array_length(eligible_items, 1), 0) = 0
     ) THEN
    INSERT INTO public.loyalty_accounts (
      user_id, paid_beverage_count, free_drinks_available,
      lifetime_free_redeemed, updated_at
    )
    VALUES (_user_id, 0, 0, 0, now())
    ON CONFLICT (user_id) DO UPDATE
    SET paid_beverage_count = 0,
        free_drinks_available = 0,
        lifetime_free_redeemed = 0,
        updated_at = now();

    RETURN jsonb_build_object(
      'enabled', enabled,
      'paid_item_count', 0,
      'free_rewards_available', 0,
      'lifetime_free_redeemed', 0,
      'threshold', threshold
    );
  END IF;

  WITH paid_orders AS (
    SELECT
      o.id AS order_id,
      CASE WHEN coalesce(o.loyalty_free_drink_amount, 0) > 0 THEN 1 ELSE 0 END AS redeemed,
      coalesce(sum(
        CASE
          WHEN coalesce(oi.item_source, 'menu') = 'menu'
            AND (
              lower('menu:' || coalesce(oi.item_category, '')) = ANY(eligible_categories)
              OR lower('menu:' || coalesce(oi.item_name, '')) = ANY(eligible_items)
            ) THEN greatest(0, oi.quantity)
          ELSE 0
        END
      ), 0)::integer AS eligible_qty
    FROM public.orders o
    LEFT JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.user_id = _user_id
      AND o.payment_status = 'paid'::public.payment_status
    GROUP BY o.id, o.loyalty_free_drink_amount
  ),
  counted AS (
    SELECT
      order_id,
      greatest(eligible_qty - redeemed, 0)::integer AS paid_items,
      redeemed
    FROM paid_orders
  ),
  upsert_earn AS (
    INSERT INTO public.loyalty_events (user_id, order_id, type, beverages_counted)
    SELECT _user_id, order_id, 'earn', paid_items
    FROM counted
    ON CONFLICT (order_id, type) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        beverages_counted = EXCLUDED.beverages_counted
    RETURNING beverages_counted
  ),
  upsert_redeem AS (
    INSERT INTO public.loyalty_events (user_id, order_id, type, beverages_counted)
    SELECT _user_id, order_id, 'redeem', 0
    FROM counted
    WHERE redeemed > 0
    ON CONFLICT (order_id, type) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        beverages_counted = EXCLUDED.beverages_counted
    RETURNING id
  )
  SELECT
    coalesce(sum(paid_items), 0)::integer,
    coalesce(sum(redeemed), 0)::integer
  INTO total_paid_items, redeemed_count
  FROM counted;

  -- Referral bonus stamps count toward the card just like purchased items.
  bonus_stamps := public.referral_bonus_stamps(_user_id);
  total_paid_items := total_paid_items + bonus_stamps;

  remainder_count := total_paid_items % threshold;
  free_available := greatest(((total_paid_items / threshold) * reward_qty) - redeemed_count, 0);

  INSERT INTO public.loyalty_accounts (
    user_id, paid_beverage_count, free_drinks_available,
    lifetime_free_redeemed, updated_at
  )
  VALUES (_user_id, remainder_count, free_available, redeemed_count, now())
  ON CONFLICT (user_id) DO UPDATE
  SET paid_beverage_count = EXCLUDED.paid_beverage_count,
      free_drinks_available = EXCLUDED.free_drinks_available,
      lifetime_free_redeemed = EXCLUDED.lifetime_free_redeemed,
      updated_at = now();

  RETURN jsonb_build_object(
    'enabled', true,
    'linked_user_id', _user_id,
    'total_paid_items', total_paid_items,
    'referral_bonus_stamps', bonus_stamps,
    'paid_item_count', remainder_count,
    'free_rewards_available', free_available,
    'lifetime_free_redeemed', redeemed_count,
    'threshold', threshold
  );
END;
$$;
