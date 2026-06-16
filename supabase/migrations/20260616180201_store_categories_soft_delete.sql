CREATE TABLE IF NOT EXISTS public.store_categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  hero_title text NOT NULL,
  hero_description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  delete_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_categories_active_idx
  ON public.store_categories(sort_order, label)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS store_categories_deleted_expiry_idx
  ON public.store_categories(delete_expires_at)
  WHERE deleted_at IS NOT NULL;

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.store_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_categories TO authenticated;

DROP POLICY IF EXISTS "Store categories active rows are public" ON public.store_categories;
CREATE POLICY "Store categories active rows are public"
ON public.store_categories
FOR SELECT
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff can view deleted store categories" ON public.store_categories;
CREATE POLICY "Staff can view deleted store categories"
ON public.store_categories
FOR SELECT TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

DROP POLICY IF EXISTS "Staff can insert store categories" ON public.store_categories;
CREATE POLICY "Staff can insert store categories"
ON public.store_categories
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

DROP POLICY IF EXISTS "Staff can update store categories" ON public.store_categories;
CREATE POLICY "Staff can update store categories"
ON public.store_categories
FOR UPDATE TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
)
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

DROP POLICY IF EXISTS "Staff can delete store categories" ON public.store_categories;
CREATE POLICY "Staff can delete store categories"
ON public.store_categories
FOR DELETE TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

DROP TRIGGER IF EXISTS trg_store_categories_touch_updated_at ON public.store_categories;
CREATE TRIGGER trg_store_categories_touch_updated_at
BEFORE UPDATE ON public.store_categories
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.store_categories (id, label, hero_title, hero_description, sort_order)
VALUES
  (
    'oil',
    'Oil',
    'Artisan Olive Oil Collection',
    'Discover our carefully curated selection of premium olive oils, sourced directly from the finest estates in the Mediterranean. Each bottle tells a story of tradition, quality, and exceptional taste.',
    10
  ),
  (
    'honey',
    'Honey',
    'Raw Honey Selection',
    'Explore our upcoming honey collection with rich floral notes, small-batch sourcing, and premium gifting potential. Product details will be refined next.',
    20
  ),
  (
    'coffee-beans',
    'Coffee Beans',
    'Specialty Coffee Beans',
    'Browse our upcoming coffee bean range featuring curated roast profiles and origin-led selections. We will replace these placeholders with the final details later.',
    30
  )
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    hero_title = EXCLUDED.hero_title,
    hero_description = EXCLUDED.hero_description,
    sort_order = EXCLUDED.sort_order,
    deleted_at = NULL,
    delete_expires_at = NULL;

CREATE OR REPLACE FUNCTION public.soft_delete_store_category(_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.store_categories
  SET deleted_at = now(),
      delete_expires_at = now() + interval '7 days'
  WHERE id = _id
    AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_store_category(_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.store_categories
  SET deleted_at = NULL,
      delete_expires_at = NULL
  WHERE id = _id
    AND deleted_at IS NOT NULL
    AND delete_expires_at > now();
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_expired_deleted_store_categories()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  purged_count integer;
BEGIN
  IF NOT (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.store_categories
  WHERE deleted_at IS NOT NULL
    AND delete_expires_at <= now();

  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RETURN purged_count;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_store_category(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_store_category(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_expired_deleted_store_categories() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.soft_delete_store_category(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_store_category(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_deleted_store_categories() TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'store_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_categories;
  END IF;
END $$;
