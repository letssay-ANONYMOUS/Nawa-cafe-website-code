import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getVisitorId } from '@/hooks/useVisitorId';

const SESSION_STORAGE_KEY = 'nawa_session_id';
const LOCAL_SESSION_PREFIX = 'local-';

interface SessionInfo {
  sessionId: string;
  visitorId: string;
  deviceType: string;
  browser: string;
}

/**
 * Detect device type from user agent
 */
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

/**
 * Detect browser from user agent
 */
const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
};

const isLocalSession = (sessionId: string) => sessionId.startsWith(LOCAL_SESSION_PREFIX);

/**
 * Hook to manage anonymous visitor sessions
 */
export const useSession = (enabled = true) => {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const createSession = useCallback(async (visitorId: string): Promise<string | null> => {
    try {
      const deviceType = getDeviceType();
      const browser = getBrowser();
      const referrer = document.referrer || null;
      const landingPage = window.location.pathname;

      const { data, error } = await supabase
        .from('visitor_sessions')
        .insert({
          visitor_id: visitorId,
          device_type: deviceType,
          browser,
          referrer,
          landing_page: landingPage,
          pages_viewed: 1,
        })
        .select('id')
        .single();

      if (error) {
        console.warn('Session persistence unavailable, using local session fallback.');
        const localSessionId = `${LOCAL_SESSION_PREFIX}${crypto.randomUUID()}`;
        sessionStorage.setItem(SESSION_STORAGE_KEY, localSessionId);
        return localSessionId;
      }

      const sessionId = data.id;
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      return sessionId;
    } catch (err) {
      console.error('Session creation error:', err);
      const localSessionId = `${LOCAL_SESSION_PREFIX}${crypto.randomUUID()}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, localSessionId);
      return localSessionId;
    }
  }, []);

  const updateSessionEnd = useCallback(async (sessionId: string) => {
    if (isLocalSession(sessionId)) return;

    try {
      await supabase
        .from('visitor_sessions')
        .update({ session_end: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (err) {
      console.error('Failed to update session end:', err);
    }
  }, []);

  const incrementPagesViewed = useCallback(async (sessionId: string) => {
    if (isLocalSession(sessionId)) return;

    try {
      const { data } = await supabase
        .from('visitor_sessions')
        .select('pages_viewed')
        .eq('id', sessionId)
        .single();

      if (data) {
        await supabase
          .from('visitor_sessions')
          .update({ pages_viewed: (data.pages_viewed || 0) + 1 })
          .eq('id', sessionId);
      }
    } catch (err) {
      console.error('Failed to increment pages viewed:', err);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSessionInfo(null);
      setIsLoading(false);
      return;
    }

    const initSession = async () => {
      const visitorId = getVisitorId();
      const existingSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);

      if (existingSessionId) {
        setSessionInfo({
          sessionId: existingSessionId,
          visitorId,
          deviceType: getDeviceType(),
          browser: getBrowser(),
        });
        setIsLoading(false);
        return;
      }

      const newSessionId = await createSession(visitorId);
      if (newSessionId) {
        setSessionInfo({
          sessionId: newSessionId,
          visitorId,
          deviceType: getDeviceType(),
          browser: getBrowser(),
        });
      }
      setIsLoading(false);
    };

    void initSession();
  }, [createSession, enabled]);

  return {
    sessionInfo,
    isLoading,
    incrementPagesViewed,
    updateSessionEnd,
  };
};

export const getSessionId = (): string | null => {
  return sessionStorage.getItem(SESSION_STORAGE_KEY);
};
