CREATE OR REPLACE FUNCTION public.has_active_discount_codes()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.discount_codes
    WHERE active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_active_discount_codes() TO anon, authenticated;