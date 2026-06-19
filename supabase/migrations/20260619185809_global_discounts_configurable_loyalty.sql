-- Separate automatic global discounts from customer-entered promo codes and
-- generalize the existing beverage loyalty counter to configurable categories
-- and individual menu/store cards.

ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS application_mode text NOT NULL DEFAULT 'manual';

ALTER TABLE public.discount_codes
  DROP CONSTRAINT IF EXISTS discount_codes_application_mode_check;

ALTER TABLE public.discount_codes
  ADD CONSTRAINT discount_codes_application_mode_check
  CHECK (application_mode IN ('manual', 'global'));

CREATE OR REPLACE FUNCTION public.keep_one_active_global_discount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.application_mode = 'global' AND NEW.active THEN
    UPDATE public.discount_codes
    SET active = false,
        updated_at = now()
    WHERE application_mode = 'global'
      AND active = true
      AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discount_codes_one_active_global ON public.discount_codes;
CREATE TRIGGER discount_codes_one_active_global
BEFORE INSERT OR UPDATE OF active, application_mode
ON public.discount_codes
FOR EACH ROW
EXECUTE FUNCTION public.keep_one_active_global_discount();

REVOKE ALL ON FUNCTION public.keep_one_active_global_discount() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.validate_discount_code(_code text)
RETURNS TABLE (
  code text,
  percent numeric,
  scope text,
  target_source text,
  target_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dc.code, dc.percent, dc.scope, dc.target_source, dc.target_name
  FROM public.discount_codes dc
  WHERE dc.code = upper(trim(_code))
    AND dc.application_mode = 'manual'
    AND dc.active = true
    AND dc.percent > 0
    AND dc.percent <= 100
    AND dc.scope IN ('cart', 'item')
    AND (dc.target_source IS NULL OR dc.target_source IN ('menu', 'store'))
    AND (dc.expires_at IS NULL OR dc.expires_at > now())
  ORDER BY dc.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_active_global_discount()
RETURNS TABLE (
  code text,
  percent numeric,
  scope text,
  target_source text,
  target_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dc.code, dc.percent, dc.scope, dc.target_source, dc.target_name
  FROM public.discount_codes dc
  WHERE dc.application_mode = 'global'
    AND dc.active = true
    AND dc.percent > 0
    AND dc.percent <= 100
    AND dc.scope IN ('cart', 'item')
    AND (dc.target_source IS NULL OR dc.target_source IN ('menu', 'store'))
    AND (dc.expires_at IS NULL OR dc.expires_at > now())
  ORDER BY dc.updated_at DESC, dc.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_active_discount_codes()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discount_codes
    WHERE application_mode = 'manual'
      AND active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_global_discount() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_discount_codes() TO anon, authenticated;

-- The old setting was mislabeled as loyalty while acting as an automatic
-- checkout discount. Disable it; staff now creates an explicit global code.
UPDATE public.kitchen_settings
SET setting_value = '0', updated_at = now()
WHERE setting_key = 'loyalty_discount_percent';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS global_discount_code text,
  ADD COLUMN IF NOT EXISTS global_discount_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS item_source text;

UPDATE public.order_items oi
SET item_source = CASE
  WHEN EXISTS (
    SELECT 1
    FROM public.store_products sp
    WHERE lower(sp.product_name) = lower(oi.item_name)
  ) THEN 'store'
  ELSE 'menu'
END
WHERE item_source IS NULL;

ALTER TABLE public.order_items
  ALTER COLUMN item_source SET DEFAULT 'menu',
  ALTER COLUMN item_source SET NOT NULL;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_item_source_check;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_item_source_check
  CHECK (item_source IN ('menu', 'store'));

INSERT INTO public.kitchen_settings (setting_key, setting_value)
VALUES
  ('loyalty_program_name', 'Nawa Rewards'),
  ('loyalty_eligible_items', '[]')
ON CONFLICT (setting_key) DO NOTHING;

-- Prefix legacy menu category IDs so menu and store categories cannot collide.
UPDATE public.kitchen_settings
SET setting_value = (
      SELECT coalesce(jsonb_agg(
        CASE
          WHEN value LIKE 'menu:%' OR value LIKE 'store:%' THEN value
          ELSE 'menu:' || value
        END
      ), '[]'::jsonb)::text
      FROM jsonb_array_elements_text(coalesce(nullif(setting_value, ''), '[]')::jsonb) AS entries(value)
    ),
    updated_at = now()
WHERE setting_key = 'loyalty_eligible_categories';

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
BEGIN
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
          WHEN (
            lower(coalesce(oi.item_source, 'menu') || ':' || coalesce(oi.item_category, '')) = ANY(eligible_categories)
            OR lower(coalesce(oi.item_source, 'menu') || ':' || coalesce(oi.item_name, '')) = ANY(eligible_items)
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
    'paid_item_count', remainder_count,
    'free_rewards_available', free_available,
    'lifetime_free_redeemed', redeemed_count,
    'threshold', threshold
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_all_customer_loyalty()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer record;
  recalculated integer := 0;
BEGIN
  IF NOT (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR customer IN SELECT user_id FROM public.customer_profiles LOOP
    PERFORM public.recalculate_customer_loyalty(customer.user_id);
    recalculated := recalculated + 1;
  END LOOP;

  RETURN recalculated;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_customer_loyalty(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_all_customer_loyalty() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_all_customer_loyalty() TO authenticated;

-- Rebuild all counters once using the normalized initial configuration.
DO $$
DECLARE
  customer record;
BEGIN
  FOR customer IN SELECT user_id FROM public.customer_profiles LOOP
    PERFORM public.recalculate_customer_loyalty(customer.user_id);
  END LOOP;
END;
$$;
