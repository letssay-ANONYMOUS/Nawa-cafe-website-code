-- Menu categories become staff-manageable instead of hardcoded only.
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  image_url text,
  start_id integer NOT NULL DEFAULT 10000,
  end_id integer NOT NULL DEFAULT 99999,
  card_ids integer[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.menu_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_categories TO authenticated;

DROP POLICY IF EXISTS "Menu categories are viewable by everyone" ON public.menu_categories;
CREATE POLICY "Menu categories are viewable by everyone"
ON public.menu_categories
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Staff can insert menu categories" ON public.menu_categories;
CREATE POLICY "Staff can insert menu categories"
ON public.menu_categories
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

DROP POLICY IF EXISTS "Staff can update menu categories" ON public.menu_categories;
CREATE POLICY "Staff can update menu categories"
ON public.menu_categories
FOR UPDATE TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

DROP POLICY IF EXISTS "Staff can delete menu categories" ON public.menu_categories;
CREATE POLICY "Staff can delete menu categories"
ON public.menu_categories
FOR DELETE TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

DROP TRIGGER IF EXISTS trg_menu_categories_touch_updated_at ON public.menu_categories;
CREATE TRIGGER trg_menu_categories_touch_updated_at
BEFORE UPDATE ON public.menu_categories
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.menu_categories (id, name, image_url, start_id, end_id, card_ids, sort_order)
VALUES
  ('nawa-breakfast', 'NAWA Breakfast', NULL, 1, 19, '{}', 10),
  ('coffee', 'COFFEE', NULL, 24, 42, '{}', 20),
  ('cold-beverages', 'Cold Beverages', '/menu-images/cold-coffee-1.jpg', 43, 58, ARRAY[43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,119,120,121,122,123,124,125], 30),
  ('manual-brew', 'MANUAL BREW', '/menu-images/manual-brew-1.jpg', 59, 173, ARRAY[59,60,61,62,63,170,171,172,173], 40),
  ('lunch-dinner', 'Lunch & Dinner', NULL, 64, 66, '{}', 50),
  ('appetisers', 'Appetisers', '/menu-images/appetiser-1.jpg', 67, 73, ARRAY[67,68,69,70,71,72,73,95], 60),
  ('pasta', 'Pasta', '/menu-images/pasta-1.jpg', 74, 76, '{}', 70),
  ('risotto', 'RISOTTO', '/menu-images/risotto-1.jpg', 77, 81, '{}', 80),
  ('spanish-dishes', 'Spanish Dishes', '/menu-images/spanish-1.jpg', 82, 83, '{}', 90),
  ('burgers', 'Burgers', '/menu-images/burger-1.jpg', 84, 91, '{}', 100),
  ('fries', 'Fries', '/menu-images/fries-1.jpg', 92, 94, '{}', 110),
  ('kids-meals', 'Kids Meals', '/menu-images/kids-meal-1.jpg', 96, 98, '{}', 120),
  ('pastries-desserts', 'Pastries & Desserts', '/menu-images/dessert-1.jpg', 99, 118, ARRAY[99,100,101,102,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118], 130),
  ('mojito', 'Mojito', '/menu-images/mojito-1.jpg', 126, 130, '{}', 140),
  ('water', 'Water', '/menu-images/water-1.jpg', 131, 133, '{}', 150),
  ('infusion', 'Infusion', '/menu-images/infusion-1.jpg', 134, 135, '{}', 160),
  ('fresh-juice', 'Fresh Juice', '/menu-images/fresh-juice-1.jpg', 136, 142, '{}', 170),
  ('matcha', 'Matcha', NULL, 143, 150, '{}', 180),
  ('nawa-special-tea', 'NAWA Special Tea', NULL, 151, 154, ARRAY[151,152,153,154,103], 190),
  ('savoury', 'Savoury', NULL, 155, 157, '{}', 200),
  ('croissants-bakery', 'Croissants & Bakery', NULL, 158, 169, '{}', 210)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    image_url = COALESCE(public.menu_categories.image_url, EXCLUDED.image_url),
    start_id = EXCLUDED.start_id,
    end_id = EXCLUDED.end_id,
    card_ids = EXCLUDED.card_ids,
    sort_order = EXCLUDED.sort_order;

-- Sequence-backed order numbers avoid count(*)+1 collisions during concurrent
-- online checkout. Existing unique constraints remain the final guardrail.
CREATE SEQUENCE IF NOT EXISTS public.nawa_order_number_seq;

WITH existing_order_suffixes AS (
  SELECT (regexp_match(order_number, '-([0-9]+)$'))[1]::bigint AS suffix
  FROM public.orders
  WHERE order_number ~ '-[0-9]+$'
)
SELECT setval(
  'public.nawa_order_number_seq',
  GREATEST(1, COALESCE((SELECT max(suffix) FROM existing_order_suffixes), 0)),
  true
);

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_counter bigint;
BEGIN
  next_counter := nextval('public.nawa_order_number_seq');
  RETURN 'NAWA-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || lpad(next_counter::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;
