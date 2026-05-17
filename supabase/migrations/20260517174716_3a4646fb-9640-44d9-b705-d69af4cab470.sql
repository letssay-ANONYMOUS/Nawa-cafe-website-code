
-- Discount codes table
CREATE TABLE public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  percent NUMERIC NOT NULL CHECK (percent > 0 AND percent <= 100),
  scope TEXT NOT NULL CHECK (scope IN ('cart', 'item')),
  target_source TEXT CHECK (target_source IN ('menu', 'store')),
  target_name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Normalize codes to uppercase
CREATE OR REPLACE FUNCTION public.normalize_discount_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := UPPER(TRIM(NEW.code));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_discount_code
BEFORE INSERT OR UPDATE ON public.discount_codes
FOR EACH ROW EXECUTE FUNCTION public.normalize_discount_code();

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Staff can manage codes
CREATE POLICY "Staff can view codes"
ON public.discount_codes FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can insert codes"
ON public.discount_codes FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update codes"
ON public.discount_codes FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can delete codes"
ON public.discount_codes FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Public validation function (no enumeration possible)
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
    AND (dc.expires_at IS NULL OR dc.expires_at > now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.validate_discount_code(TEXT) TO anon, authenticated;

-- Track applied codes on orders
ALTER TABLE public.orders
  ADD COLUMN applied_discount_code TEXT,
  ADD COLUMN code_discount_amount NUMERIC NOT NULL DEFAULT 0;
