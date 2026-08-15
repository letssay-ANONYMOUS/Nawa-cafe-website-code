-- Email confirmation via a random 6-digit code sent with Resend.
--
-- Codes are stored HASHED (sha-256 of code + per-row salt) so a database leak
-- never exposes a usable code. All writes happen in service-role edge
-- functions (send-verification-code / verify-email-code), so RLS is enabled
-- with no policies for customers — the table is invisible to the anon/auth
-- roles entirely.

CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  salt text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Newest-code lookup per user, and cleanup scans by expiry.
CREATE INDEX IF NOT EXISTS email_verification_codes_user_created_idx
  ON public.email_verification_codes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_verification_codes_expires_idx
  ON public.email_verification_codes (expires_at);

-- Mark on the customer profile once the address is confirmed.
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Housekeeping: drop codes that are long dead (expired or used > 1 day ago).
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
  WHERE (expires_at < now() - interval '1 day')
     OR (consumed_at IS NOT NULL AND consumed_at < now() - interval '1 day');
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_verification_codes() FROM PUBLIC;
