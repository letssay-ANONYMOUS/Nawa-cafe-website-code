import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures a valid Supabase session exists before making authenticated requests.
 * If the current session is missing or expired it attempts a refresh.
 * Returns the access token or null if unauthenticated.
 */
export async function ensureSession(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.expires_at) {
    const expiresAt = session.expires_at * 1000; // convert to ms
    const buffer = 60_000; // refresh 60 s before expiry
    if (Date.now() < expiresAt - buffer) {
      return session.access_token;
    }
  }

  // Session missing or about to expire – try refresh
  const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
  if (error || !refreshed) {
    console.warn('ensureSession: could not refresh', error?.message);
    return null;
  }
  return refreshed.access_token;
}
