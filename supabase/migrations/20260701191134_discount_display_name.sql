-- Add a customer-facing discount label so automatic/global discounts can show
-- names like "Summer offer" in the cart instead of the generic label.

ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS display_name text;

UPDATE public.discount_codes
SET display_name = code
WHERE display_name IS NULL;

DROP FUNCTION IF EXISTS public.validate_discount_code(text);

CREATE OR REPLACE FUNCTION public.validate_discount_code(_code text)
RETURNS TABLE (
  code text,
  display_name text,
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
  SELECT
    dc.code,
    COALESCE(NULLIF(BTRIM(dc.display_name), ''), dc.code) AS display_name,
    dc.percent,
    dc.scope,
    dc.target_source,
    dc.target_name
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

DROP FUNCTION IF EXISTS public.get_active_global_discount();

CREATE OR REPLACE FUNCTION public.get_active_global_discount()
RETURNS TABLE (
  code text,
  display_name text,
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
  SELECT
    dc.code,
    COALESCE(NULLIF(BTRIM(dc.display_name), ''), dc.code) AS display_name,
    dc.percent,
    dc.scope,
    dc.target_source,
    dc.target_name
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

GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_global_discount() TO anon, authenticated;
