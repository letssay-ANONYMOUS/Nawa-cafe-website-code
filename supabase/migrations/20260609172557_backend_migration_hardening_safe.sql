-- Low-risk backend hardening after the Lovable -> Supabase migration.
-- This intentionally does NOT change auth settings, staff login behavior,
-- public checkout/tracking insert policies, GraphQL exposure, storage bucket
-- policies, or public discount-code RPC access.

-- Restore schema guardrails that existed in local migrations but were missing
-- from the migrated live schema. Each block checks current data first so the
-- migration fails loudly if existing rows would violate a constraint.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.orders
    GROUP BY order_number
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add orders_order_number_key: duplicate order_number rows exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_order_number_key'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.store_products
    GROUP BY product_key
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add store_products_product_key_unique: duplicate product_key rows exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.store_products'::regclass
      AND conname = 'store_products_product_key_unique'
  ) THEN
    ALTER TABLE public.store_products
      ADD CONSTRAINT store_products_product_key_unique UNIQUE (product_key);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.menu_items
    WHERE card_number IS NOT NULL
    GROUP BY card_number
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add idx_menu_items_card_number: duplicate card_number rows exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_card_number
ON public.menu_items(card_number)
WHERE card_number IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.order_items oi
    LEFT JOIN public.menu_items mi ON mi.id = oi.menu_item_id
    WHERE oi.menu_item_id IS NOT NULL
      AND mi.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add order_items_menu_item_id_fkey: orphaned menu_item_id rows exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.order_items'::regclass
      AND conname = 'order_items_menu_item_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_menu_item_id_fkey
      FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
      ON DELETE SET NULL
      NOT VALID;
    ALTER TABLE public.order_items VALIDATE CONSTRAINT order_items_menu_item_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.page_views pv
    LEFT JOIN public.visitor_sessions vs ON vs.id = pv.session_id
    WHERE pv.session_id IS NOT NULL
      AND vs.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add page_views_session_id_fkey: orphaned session_id rows exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.page_views'::regclass
      AND conname = 'page_views_session_id_fkey'
  ) THEN
    ALTER TABLE public.page_views
      ADD CONSTRAINT page_views_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.visitor_sessions(id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE public.page_views VALIDATE CONSTRAINT page_views_session_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.page_interactions pi
    LEFT JOIN public.visitor_sessions vs ON vs.id = pi.session_id
    WHERE pi.session_id IS NOT NULL
      AND vs.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add page_interactions_session_id_fkey: orphaned session_id rows exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.page_interactions'::regclass
      AND conname = 'page_interactions_session_id_fkey'
  ) THEN
    ALTER TABLE public.page_interactions
      ADD CONSTRAINT page_interactions_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.visitor_sessions(id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE public.page_interactions VALIDATE CONSTRAINT page_interactions_session_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.menu_item_views mv
    LEFT JOIN public.menu_items mi ON mi.id = mv.menu_item_id
    WHERE mv.menu_item_id IS NOT NULL
      AND mi.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add menu_item_views_menu_item_id_fkey: orphaned menu_item_id rows exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.menu_item_views'::regclass
      AND conname = 'menu_item_views_menu_item_id_fkey'
  ) THEN
    ALTER TABLE public.menu_item_views
      ADD CONSTRAINT menu_item_views_menu_item_id_fkey
      FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
      ON DELETE SET NULL
      NOT VALID;
    ALTER TABLE public.menu_item_views VALIDATE CONSTRAINT menu_item_views_menu_item_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN auth.users au ON au.id = ur.user_id
    WHERE au.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add user_roles_user_id_fkey: orphaned user_id rows exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_roles'::regclass
      AND conname = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE public.user_roles VALIDATE CONSTRAINT user_roles_user_id_fkey;
  END IF;
END $$;

-- Remove a stale public function from an older schema. It referenced old
-- columns (line_total_aed/subtotal_aed/total_aed) that do not exist anymore,
-- and no app code or trigger calls it.
DROP FUNCTION IF EXISTS public.recalc_order_totals(uuid);

-- Fix mutable search_path on the remaining shared timestamp trigger helper.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Keep the same access model while reducing RLS policy churn and per-row
-- auth.uid() initialization overhead.
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers and staff can view profiles" ON public.customer_profiles;
CREATE POLICY "Customers and staff can view profiles"
ON public.customer_profiles
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

DROP POLICY IF EXISTS "Customers can view own loyalty account" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "Staff can view all loyalty accounts" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "Customers and staff can view loyalty accounts" ON public.loyalty_accounts;
CREATE POLICY "Customers and staff can view loyalty accounts"
ON public.loyalty_accounts
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

DROP POLICY IF EXISTS "Customers can view own loyalty events" ON public.loyalty_events;
DROP POLICY IF EXISTS "Staff can view all loyalty events" ON public.loyalty_events;
DROP POLICY IF EXISTS "Customers and staff can view loyalty events" ON public.loyalty_events;
CREATE POLICY "Customers and staff can view loyalty events"
ON public.loyalty_events
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can view orders" ON public.orders;
DROP POLICY IF EXISTS "Customers and staff can view orders" ON public.orders;
CREATE POLICY "Customers and staff can view orders"
ON public.orders
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Customers can update own profile"
ON public.customer_profiles
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Staff can view codes"
ON public.discount_codes
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can insert codes"
ON public.discount_codes
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can update codes"
ON public.discount_codes
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can delete codes"
ON public.discount_codes
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can insert kitchen settings"
ON public.kitchen_settings
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can update kitchen settings"
ON public.kitchen_settings
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can delete menu cards"
ON public.menu_cards
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can insert menu cards"
ON public.menu_cards
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can update menu cards"
ON public.menu_cards
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can view order items"
ON public.order_items
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can update orders"
ON public.orders
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can delete store products"
ON public.store_products
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can insert store products"
ON public.store_products
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Staff can update store products"
ON public.store_products
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

ALTER POLICY "Users can read own roles"
ON public.user_roles
USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can view own credentials"
ON public.webauthn_credentials
USING (user_id = (SELECT auth.uid()));
