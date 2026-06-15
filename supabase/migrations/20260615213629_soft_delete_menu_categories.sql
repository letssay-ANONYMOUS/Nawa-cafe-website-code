ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delete_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS menu_categories_active_idx
  ON public.menu_categories(sort_order, name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS menu_categories_deleted_expiry_idx
  ON public.menu_categories(delete_expires_at)
  WHERE deleted_at IS NOT NULL;

DROP POLICY IF EXISTS "Menu categories are viewable by everyone" ON public.menu_categories;
DROP POLICY IF EXISTS "Menu categories active rows are public" ON public.menu_categories;
CREATE POLICY "Menu categories active rows are public"
ON public.menu_categories
FOR SELECT
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff can view deleted menu categories" ON public.menu_categories;
CREATE POLICY "Staff can view deleted menu categories"
ON public.menu_categories
FOR SELECT TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
);

CREATE OR REPLACE FUNCTION public.soft_delete_menu_category(_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.menu_categories
  SET deleted_at = now(),
      delete_expires_at = now() + interval '7 days'
  WHERE id = _id
    AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_menu_category(_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'staff'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.menu_categories
  SET deleted_at = NULL,
      delete_expires_at = NULL
  WHERE id = _id
    AND deleted_at IS NOT NULL
    AND delete_expires_at > now();
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_expired_deleted_menu_categories()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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

  DELETE FROM public.menu_categories
  WHERE deleted_at IS NOT NULL
    AND delete_expires_at <= now();

  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RETURN purged_count;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_menu_category(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_menu_category(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_expired_deleted_menu_categories() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.soft_delete_menu_category(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_menu_category(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_deleted_menu_categories() TO authenticated;
