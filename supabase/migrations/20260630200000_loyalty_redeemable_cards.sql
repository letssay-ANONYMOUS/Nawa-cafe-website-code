-- Beanz-style two-flag stamp system, menu-only.
--
-- The existing loyalty_eligible_categories / loyalty_eligible_items settings
-- stay as the EARN set ("this card gives a stamp"). This migration adds a
-- separate REDEEM set so a manager can mark which menu cards a customer may
-- claim for free once enough stamps are collected — independent of which
-- cards hand out stamps. Stamps are menu-only; store products never earn or
-- redeem, enforced here at the database level (not just in the UI) so any
-- store entries a manager configured before this change stop counting.
--
-- Redemption itself is computed in the create-ziina-checkout edge function and
-- the customer quote hook; this migration seeds the setting key so the staff
-- UI and edge function can read/write it. When the redeem set is empty the
-- redemption logic falls back to the earn set (preserving prior behavior).

INSERT INTO public.kitchen_settings (setting_key, setting_value)
VALUES ('loyalty_redeemable_items', '[]')
ON CONFLICT (setting_key) DO NOTHING;

-- Drop any "store:"-prefixed entries from the earn set: stamps are menu-only
-- going forward, and the staff UI no longer offers store categories/cards.
UPDATE public.kitchen_settings
SET setting_value = (
  SELECT coalesce(jsonb_agg(value), '[]'::jsonb)::text
  FROM jsonb_array_elements_text(setting_value::jsonb) AS entries(value)
  WHERE value NOT LIKE 'store:%'
)
WHERE setting_key IN ('loyalty_eligible_categories', 'loyalty_eligible_items')
  AND setting_value IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Harden recalculate_customer_loyalty: only count menu order_items toward
-- stamps, regardless of what the settings contain (defense in depth).
-- Identical to the prior version except the eligibility CASE now also
-- requires item_source = 'menu'.
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

-- Re-run for all existing customers so accounts reflect menu-only counting
-- immediately (only takes effect if the caller is staff/admin; safe no-op
-- otherwise since this runs as the migration's elevated role).
DO $$
DECLARE
  customer record;
BEGIN
  FOR customer IN SELECT user_id FROM public.customer_profiles LOOP
    PERFORM public.recalculate_customer_loyalty(customer.user_id);
  END LOOP;
END;
$$;
