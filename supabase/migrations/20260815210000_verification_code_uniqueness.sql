-- No-repeat verification codes.
--
-- Codes are now lowercase alphanumeric and must not be re-issued to anyone for
-- at least two months. The per-row salted hash cannot be searched (each row has
-- its own salt), so we add a deterministic HMAC fingerprint keyed by a server
-- secret (CODE_PEPPER). The fingerprint is only used to answer "has this exact
-- code been handed out recently?" — it never replaces the salted hash used for
-- verification.

ALTER TABLE public.email_verification_codes
  ADD COLUMN IF NOT EXISTS code_fingerprint text;

CREATE INDEX IF NOT EXISTS email_verification_codes_fingerprint_idx
  ON public.email_verification_codes (code_fingerprint, created_at DESC);

-- Retention must now outlive the reuse window, so rows stay queryable for the
-- uniqueness check. Keep everything for 2 months + a small buffer, then purge.
CREATE OR REPLACE FUNCTION public.purge_expired_verification_codes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer := 0;
BEGIN
  DELETE FROM public.email_verification_codes
  WHERE created_at < now() - interval '65 days';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_verification_codes() FROM PUBLIC;
