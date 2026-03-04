import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getVisitorId } from '@/hooks/useVisitorId';
import { generateFingerprint, getBrowserInfo, getDeviceType } from '@/hooks/useFingerprint';

const TRACKING_DONE_KEY = 'nawa_essential_tracked';
const TRACK_INTERVAL = 1000 * 60 * 5; // 5 minutes

/**
 * Hook for essential tracking that runs without consent
 * Tracks: fingerprint, browser, device, IP (via edge function)
 */
export const useEssentialTracking = (enabled = true) => {
  const hasTracked = useRef(false);

  const trackVisitor = useCallback(async () => {
    if (!enabled) return;

    const visitorId = getVisitorId();
    if (!visitorId) return;

    const lastTracked = localStorage.getItem(TRACKING_DONE_KEY);
    if (lastTracked) {
      const elapsed = Date.now() - parseInt(lastTracked, 10);
      if (elapsed < TRACK_INTERVAL) {
        console.log('Essential tracking: skipped (tracked recently)');
        return;
      }
    }

    try {
      const fingerprint = await generateFingerprint();
      const { browser, version, os } = getBrowserInfo();
      const deviceType = getDeviceType();
      const screenResolution = `${screen.width}x${screen.height}`;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      console.log('Essential tracking: sending data to edge function');

      const { data, error } = await supabase.functions.invoke('track-visitor', {
        body: {
          visitor_id: visitorId,
          fingerprint,
          browser,
          browser_version: version,
          os,
          device_type: deviceType,
          screen_resolution: screenResolution,
          timezone,
        },
      });

      if (error) {
        console.error('Essential tracking error:', error);
        return;
      }

      console.log('Essential tracking: success', data);
      localStorage.setItem(TRACKING_DONE_KEY, String(Date.now()));
    } catch (error) {
      console.error('Essential tracking failed:', error);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || hasTracked.current) return;

    hasTracked.current = true;

    const timeout = setTimeout(() => {
      void trackVisitor();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [enabled, trackVisitor]);

  return { trackVisitor };
};

export default useEssentialTracking;
