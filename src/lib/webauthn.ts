import {
  startRegistration,
  startAuthentication,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';

/** True when the device has a platform authenticator (Face ID / fingerprint). */
export const hasPlatformAuthenticator = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
};

/**
 * Enroll the current device as a passkey for the signed-in user.
 * Call after `supabase.auth.signUp` / `signInWithPassword` so the session
 * JWT is in place (supabase.functions.invoke attaches it automatically).
 */
export const registerPasskey = async (deviceLabel?: string): Promise<void> => {
  const { data: options, error: optErr } = await supabase.functions.invoke(
    'webauthn-register-options',
  );
  if (optErr || !options) throw new Error('Could not start passkey registration');

  // Triggers Face ID / fingerprint enrolment prompt on the device.
  const registrationResponse = await startRegistration(options);

  const { data, error } = await supabase.functions.invoke('webauthn-register-verify', {
    body: { response: registrationResponse, deviceLabel },
  });
  if (error || !data?.verified) throw new Error(data?.error || 'Passkey registration failed');
};

/**
 * Assert a passkey for the currently signed-in user (second factor after password).
 * Triggers Face ID / fingerprint on the device.
 */
export const assertPasskey = async (): Promise<void> => {
  const { data: options, error: optErr } = await supabase.functions.invoke(
    'webauthn-auth-options',
  );
  if (optErr || !options) throw new Error('Could not start biometric check');

  const authResponse = await startAuthentication(options);

  const { data, error } = await supabase.functions.invoke('webauthn-auth-verify', {
    body: { response: authResponse },
  });
  if (error || !data?.verified) throw new Error(data?.error || 'Biometric verification failed');
};

/** Returns the number of passkeys registered for the signed-in user. */
export const getPasskeyCount = async (userId: string): Promise<number> => {
  const { data } = await supabase
    .from('webauthn_credentials')
    .select('id')
    .eq('user_id', userId);
  return data?.length ?? 0;
};
