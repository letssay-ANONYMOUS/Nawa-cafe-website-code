-- Keep customer order history and beverage loyalty in sync even when a
-- customer creates an account after ordering or staff later marks cash paid.

CREATE OR REPLACE FUNCTION public.normalize_customer_phone(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  digits text;
BEGIN
  digits := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');

  IF digits = '' THEN
    RETURN '';
  END IF;

  IF left(digits, 2) = '00' THEN
    digits := substr(digits, 3);
  END IF;

  IF left(digits, 3) = '971' THEN
    RETURN digits;
  END IF;

  IF length(digits) = 10 AND left(digits, 2) = '05' THEN
    RETURN '971' || substr(digits, 2);
  END IF;

  IF length(digits) = 9 AND left(digits, 1) = '5' THEN
    RETURN '971' || digits;
  END IF;

  RETURN digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_customer_orders_to_account(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_email text;
  auth_email text;
  match_email text;
  match_phone text;
  linked_count integer := 0;
BEGIN
  SELECT lower(nullif(cp.email, '')),
         public.normalize_customer_phone(cp.phone)
  INTO profile_email, match_phone
  FROM public.customer_profiles cp
  WHERE cp.user_id = _user_id;

  SELECT lower(nullif(au.email, ''))
  INTO auth_email
  FROM auth.users au
  WHERE au.id = _user_id;

  match_email := coalesce(profile_email, auth_email, '');

  IF coalesce(match_email, '') = '' AND coalesce(match_phone, '') = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.orders o
  SET user_id = _user_id
  WHERE o.user_id IS NULL
    AND (
      (
        coalesce(match_email, '') <> ''
        AND lower(coalesce(o.customer_email, '')) = match_email
      )
      OR (
        coalesce(match_phone, '') <> ''
        AND public.normalize_customer_phone(o.customer_phone) = match_phone
      )
    );

  GET DIAGNOSTICS linked_count = ROW_COUNT;
  RETURN linked_count;
END;
$$;

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
  eligible_json text;
  total_paid_beverages integer := 0;
  redeemed_count integer := 0;
  remainder_count integer := 0;
  free_available integer := 0;
BEGIN
  SELECT coalesce(max(setting_value) FILTER (WHERE setting_key = 'loyalty_enabled'), 'true') <> 'false',
         greatest(1, coalesce(nullif(max(setting_value) FILTER (WHERE setting_key = 'loyalty_threshold'), '')::integer, 10)),
         greatest(1, coalesce(nullif(max(setting_value) FILTER (WHERE setting_key = 'loyalty_reward_qty'), '')::integer, 1)),
         max(setting_value) FILTER (WHERE setting_key = 'loyalty_eligible_categories')
  INTO enabled, threshold, reward_qty, eligible_json
  FROM public.kitchen_settings
  WHERE setting_key IN (
    'loyalty_enabled',
    'loyalty_threshold',
    'loyalty_reward_qty',
    'loyalty_eligible_categories'
  );

  IF NOT enabled THEN
    INSERT INTO public.loyalty_accounts (
      user_id,
      paid_beverage_count,
      free_drinks_available,
      lifetime_free_redeemed,
      updated_at
    )
    VALUES (_user_id, 0, 0, 0, now())
    ON CONFLICT (user_id) DO UPDATE
    SET paid_beverage_count = 0,
        free_drinks_available = 0,
        lifetime_free_redeemed = 0,
        updated_at = now();

    RETURN jsonb_build_object(
      'enabled', false,
      'paid_beverage_count', 0,
      'free_drinks_available', 0,
      'lifetime_free_redeemed', 0
    );
  END IF;

  BEGIN
    SELECT coalesce(array_agg(value), ARRAY[]::text[])
    INTO eligible_categories
    FROM jsonb_array_elements_text(coalesce(eligible_json, '[]')::jsonb) AS value;
  EXCEPTION WHEN others THEN
    eligible_categories := ARRAY[]::text[];
  END;

  IF coalesce(array_length(eligible_categories, 1), 0) = 0 THEN
    eligible_categories := ARRAY[
      'coffee',
      'cold-beverages',
      'manual-brew',
      'mojito',
      'water',
      'infusion',
      'fresh-juice',
      'matcha',
      'nawa-special-tea',
      'arabic-coffee',
      'nawa-summer'
    ];
  END IF;

  WITH paid_orders AS (
    SELECT
      o.id AS order_id,
      CASE WHEN coalesce(o.loyalty_free_drink_amount, 0) > 0 THEN 1 ELSE 0 END AS redeemed,
      coalesce(
        sum(
          CASE
            WHEN oi.item_category = ANY(eligible_categories)
            THEN greatest(0, oi.quantity)
            ELSE 0
          END
        ),
        0
      )::integer AS eligible_qty
    FROM public.orders o
    LEFT JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.user_id = _user_id
      AND o.payment_status = 'paid'::public.payment_status
    GROUP BY o.id, o.loyalty_free_drink_amount
  ),
  counted AS (
    SELECT
      order_id,
      greatest(eligible_qty - redeemed, 0)::integer AS paid_beverages,
      redeemed
    FROM paid_orders
  ),
  upsert_earn AS (
    INSERT INTO public.loyalty_events (user_id, order_id, type, beverages_counted)
    SELECT _user_id, order_id, 'earn', paid_beverages
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
    coalesce(sum(paid_beverages), 0)::integer,
    coalesce(sum(redeemed), 0)::integer
  INTO total_paid_beverages, redeemed_count
  FROM counted;

  remainder_count := total_paid_beverages % threshold;
  free_available := greatest(((total_paid_beverages / threshold) * reward_qty) - redeemed_count, 0);

  INSERT INTO public.loyalty_accounts (
    user_id,
    paid_beverage_count,
    free_drinks_available,
    lifetime_free_redeemed,
    updated_at
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
    'total_paid_beverages', total_paid_beverages,
    'paid_beverage_count', remainder_count,
    'free_drinks_available', free_available,
    'lifetime_free_redeemed', redeemed_count,
    'threshold', threshold
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_customer_account_orders(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  linked_count integer;
  loyalty_result jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Missing user id';
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL
     AND (SELECT auth.uid()) <> _user_id
     AND NOT (
       public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
       OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
     ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  linked_count := public.link_customer_orders_to_account(_user_id);
  loyalty_result := public.recalculate_customer_loyalty(_user_id);

  RETURN loyalty_result || jsonb_build_object('linked_orders', linked_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_customer_profile_order_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_customer_account_orders(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_profiles_sync_orders ON public.customer_profiles;
CREATE TRIGGER customer_profiles_sync_orders
AFTER INSERT OR UPDATE OF email, phone
ON public.customer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_customer_profile_order_sync();

CREATE OR REPLACE FUNCTION public.handle_paid_order_customer_loyalty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  order_email text;
  order_phone text;
BEGIN
  IF NEW.payment_status <> 'paid'::public.payment_status THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.payment_status = 'paid'::public.payment_status
     AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id THEN
    RETURN NEW;
  END IF;

  target_user_id := NEW.user_id;

  IF target_user_id IS NULL THEN
    order_email := lower(coalesce(NEW.customer_email, ''));
    order_phone := public.normalize_customer_phone(NEW.customer_phone);

    SELECT cp.user_id
    INTO target_user_id
    FROM public.customer_profiles cp
    WHERE (
      order_email <> ''
      AND lower(coalesce(cp.email, '')) = order_email
    )
    OR (
      order_phone <> ''
      AND public.normalize_customer_phone(cp.phone) = order_phone
    )
    ORDER BY cp.created_at ASC
    LIMIT 1;

    IF target_user_id IS NOT NULL THEN
      UPDATE public.orders
      SET user_id = target_user_id
      WHERE id = NEW.id
        AND user_id IS NULL;
    END IF;
  END IF;

  IF target_user_id IS NOT NULL THEN
    PERFORM public.recalculate_customer_loyalty(target_user_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_paid_customer_loyalty ON public.orders;
CREATE TRIGGER orders_paid_customer_loyalty
AFTER INSERT OR UPDATE OF payment_status
ON public.orders
FOR EACH ROW
WHEN (NEW.payment_status = 'paid'::public.payment_status)
EXECUTE FUNCTION public.handle_paid_order_customer_loyalty();

UPDATE public.kitchen_settings
SET setting_value = '["coffee","cold-beverages","manual-brew","mojito","water","infusion","fresh-juice","matcha","nawa-special-tea","arabic-coffee","nawa-summer"]',
    updated_at = now()
WHERE setting_key = 'loyalty_eligible_categories';

INSERT INTO public.kitchen_settings (setting_key, setting_value)
VALUES (
  'loyalty_eligible_categories',
  '["coffee","cold-beverages","manual-brew","mojito","water","infusion","fresh-juice","matcha","nawa-special-tea","arabic-coffee","nawa-summer"]'
)
ON CONFLICT (setting_key) DO NOTHING;

REVOKE ALL ON FUNCTION public.normalize_customer_phone(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_customer_orders_to_account(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_customer_loyalty(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_customer_account_orders(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_customer_profile_order_sync() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_paid_order_customer_loyalty() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.normalize_customer_phone(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_customer_account_orders(uuid) TO authenticated;
