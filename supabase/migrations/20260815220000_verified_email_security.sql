-- Security hardening for customer accounts.
--
-- 1. Customers could previously set customer_profiles.email_verified_at
--    themselves: RLS has no column-level restriction and the profile UPDATE
--    policy allows writing any column. A guard trigger now pins the
--    verification columns unless the write comes from the service role.
-- 2. Email verification did not gate anything, so an account created with
--    someone else's address could still bank rewards. Free rewards are now
--    withheld until the address is confirmed.
--
-- Written additively (new functions + triggers) so it composes with the
-- existing loyalty recalculation instead of replacing it.

-- ---------------------------------------------------------------------------
-- 1. Customers cannot self-verify.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_customer_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  jwt_role text := claims ->> 'role';
BEGIN
  -- No JWT at all => direct database/migration access, leave it alone.
  -- service_role => our own edge functions, allowed to set verification.
  -- Anything else (anon / authenticated customer) => freeze these columns.
  IF claims IS NOT NULL AND jwt_role IS DISTINCT FROM 'service_role' THEN
    NEW.email_verified_at := OLD.email_verified_at;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_profiles_guard_update ON public.customer_profiles;
CREATE TRIGGER customer_profiles_guard_update
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_profile_update();

-- ---------------------------------------------------------------------------
-- 2. Grandfather existing customers.
-- Accounts that predate email verification must not lose rewards they already
-- earned, so treat them as confirmed as of their signup date.
-- ---------------------------------------------------------------------------
UPDATE public.customer_profiles
SET email_verified_at = created_at
WHERE email_verified_at IS NULL
  AND created_at < now();

-- ---------------------------------------------------------------------------
-- 3. Unconfirmed accounts cannot hold a claimable free reward.
-- Stamps still accumulate (paid_beverage_count is untouched) so nothing is
-- lost — the reward simply cannot be redeemed until the email is confirmed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_verified_email_for_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.customer_profiles p
    WHERE p.user_id = NEW.user_id
      AND p.email_verified_at IS NOT NULL
  ) THEN
    NEW.free_drinks_available := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS loyalty_accounts_require_verified_email ON public.loyalty_accounts;
CREATE TRIGGER loyalty_accounts_require_verified_email
  BEFORE INSERT OR UPDATE ON public.loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_verified_email_for_rewards();

-- ---------------------------------------------------------------------------
-- 4. Let the verification edge function refresh loyalty immediately after a
-- customer confirms, so their banked reward unlocks without waiting for the
-- next paid order.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.recalculate_customer_loyalty(uuid) TO service_role;
