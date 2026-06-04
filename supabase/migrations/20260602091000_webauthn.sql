-- WebAuthn passkey support (Face ID / fingerprint for customer sign-in).
-- Credentials are enrolled per-device after a successful password sign-in.
-- Challenges are short-lived (5 min TTL). All writes happen via service-role
-- edge functions; customers may only read their own rows.

-- ---------------------------------------------------------------------------
-- webauthn_credentials: one row per enrolled authenticator per user
-- ---------------------------------------------------------------------------
CREATE TABLE public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,   -- base64url-encoded credential ID
  public_key text NOT NULL,             -- base64url-encoded COSE public key
  counter bigint NOT NULL DEFAULT 0,
  device_type text,                     -- 'platform' | 'cross-platform'
  backed_up boolean NOT NULL DEFAULT false,
  transports text[],
  device_label text,                    -- human-friendly label, e.g. "iPhone 16"
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credentials"
  ON public.webauthn_credentials FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Writes go through service-role edge functions — no INSERT/UPDATE/DELETE
-- policies are granted to authenticated role.

-- ---------------------------------------------------------------------------
-- webauthn_challenges: ephemeral, one pending challenge per user per type.
-- PRIMARY KEY (user_id, type) guarantees only one challenge at a time.
-- ---------------------------------------------------------------------------
CREATE TABLE public.webauthn_challenges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('registration', 'authentication')),
  challenge text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  PRIMARY KEY (user_id, type)
);

-- No RLS — accessed exclusively via service-role in edge functions.

-- Scheduled clean-up for expired challenges (Supabase pg_cron or manual sweep).
-- Edge functions also prune stale rows on each request.
