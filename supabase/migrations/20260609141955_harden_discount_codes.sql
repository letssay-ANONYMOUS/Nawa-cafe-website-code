-- Harden discount-code data integrity after the backend migration from Lovable.
-- The original schema had these constraints, but the exported Supabase backend
-- can miss them. Keep this migration idempotent so it is safe on projects that
-- already have part of the original schema.

DO $$
DECLARE
  code_attnum smallint;
BEGIN
  IF to_regclass('public.discount_codes') IS NULL THEN
    RAISE EXCEPTION 'public.discount_codes does not exist';
  END IF;

  SELECT attnum
  INTO code_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.discount_codes'::regclass
    AND attname = 'code'
    AND NOT attisdropped;

  IF code_attnum IS NULL THEN
    RAISE EXCEPTION 'public.discount_codes.code does not exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.discount_codes
    WHERE percent IS NULL OR percent <= 0 OR percent > 100
  ) THEN
    RAISE EXCEPTION 'Cannot harden discount_codes: invalid percent rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.discount_codes
    WHERE scope IS NULL OR scope NOT IN ('cart', 'item')
  ) THEN
    RAISE EXCEPTION 'Cannot harden discount_codes: invalid scope rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.discount_codes
    WHERE target_source IS NOT NULL AND target_source NOT IN ('menu', 'store')
  ) THEN
    RAISE EXCEPTION 'Cannot harden discount_codes: invalid target_source rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.discount_codes
    GROUP BY code
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot harden discount_codes: duplicate code rows exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.discount_codes'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[code_attnum]::smallint[]
  ) THEN
    ALTER TABLE public.discount_codes
      ADD CONSTRAINT discount_codes_code_unique UNIQUE (code);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.discount_codes'::regclass
      AND conname = 'discount_codes_percent_check'
  ) THEN
    ALTER TABLE public.discount_codes
      ADD CONSTRAINT discount_codes_percent_check CHECK (percent > 0 AND percent <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.discount_codes'::regclass
      AND conname = 'discount_codes_scope_check'
  ) THEN
    ALTER TABLE public.discount_codes
      ADD CONSTRAINT discount_codes_scope_check CHECK (scope IN ('cart', 'item'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.discount_codes'::regclass
      AND conname = 'discount_codes_target_source_check'
  ) THEN
    ALTER TABLE public.discount_codes
      ADD CONSTRAINT discount_codes_target_source_check CHECK (
        target_source IS NULL OR target_source IN ('menu', 'store')
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_discount_code(_code TEXT)
RETURNS TABLE (
  code TEXT,
  percent NUMERIC,
  scope TEXT,
  target_source TEXT,
  target_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dc.code, dc.percent, dc.scope, dc.target_source, dc.target_name
  FROM public.discount_codes dc
  WHERE dc.code = UPPER(TRIM(_code))
    AND dc.active = true
    AND dc.percent > 0
    AND dc.percent <= 100
    AND dc.scope IN ('cart', 'item')
    AND (dc.target_source IS NULL OR dc.target_source IN ('menu', 'store'))
    AND (dc.expires_at IS NULL OR dc.expires_at > now())
  ORDER BY dc.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.validate_discount_code(TEXT) TO anon, authenticated;
