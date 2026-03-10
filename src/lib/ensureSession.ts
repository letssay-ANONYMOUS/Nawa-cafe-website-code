import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the current access token if a session exists.
 *
 * KEY FIX: We no longer call refreshSession() manually here.
 * The Supabase client has autoRefreshToken: true — it refreshes
 * the token in the background before expiry. Calling refreshSession()
 * from multiple places simultaneously revokes tokens and kills sessions.
 */
export async function ensureSession(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
