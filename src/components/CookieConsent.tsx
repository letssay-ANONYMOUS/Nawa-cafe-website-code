import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'nawa_cookie_consent';
const CONSENT_CHANGED_EVENT = 'nawa_consent_changed';

type ConsentStatus = 'pending' | 'accepted' | 'declined';

interface CookiePreferences {
  essential: boolean; // Always true - required for site to function
  analytics: boolean; // Optional - for tracking/analytics
  marketing: boolean; // Optional - for marketing purposes
}

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (preferences: CookiePreferences) => {
    const consentData = {
      ...preferences,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    
    // Notify all components that consent has changed
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { 
      detail: preferences 
    }));
    
    setShowBanner(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
    });
  };

  const handleAcceptEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
    });
  };

  const handleDecline = () => {
    // Still save essential cookies (required for site function)
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
    });
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-3 animate-in slide-in-from-bottom-5 duration-300 touch-manipulation">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-lg shadow-lg px-4 py-3 sm:px-5 sm:py-3">
        {/* Desktop: single row layout */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Cookie className="w-4 h-4 text-primary flex-shrink-0 hidden sm:block" />
          
          <p className="text-xs text-muted-foreground sm:flex-1 sm:min-w-0 leading-snug">
            We use cookies to enhance your experience and analyze traffic.{' '}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-primary hover:underline text-xs touch-manipulation"
            >
              {showDetails ? 'Hide details' : 'Learn more'}
            </button>
          </p>
          
          <div className="flex gap-2 flex-shrink-0">
            <Button 
              onClick={handleAcceptAll}
              size="sm"
              className="bg-primary hover:bg-primary/90 min-h-[44px] sm:min-h-[36px] px-3 text-xs touch-manipulation"
            >
              Accept
            </Button>
            <Button 
              onClick={handleAcceptEssential}
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-[36px] px-3 text-xs touch-manipulation"
            >
              Essential Only
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
              onClick={handleDecline}
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {showDetails && (
          <div className="mt-2 p-2 bg-muted rounded-md space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="font-medium">Essential Cookies</span>
              <span className="text-muted-foreground">Always Active</span>
            </div>
            <p className="text-muted-foreground text-xs">Required for site to function. Includes visitor ID and cart.</p>
            <div className="flex justify-between mt-1">
              <span className="font-medium">Analytics Cookies</span>
              <span className="text-muted-foreground">Optional</span>
            </div>
            <p className="text-muted-foreground text-xs">Help us understand how visitors interact with our website.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hook to check cookie consent status
 */
export const useCookieConsent = () => {
  const [consent, setConsent] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    // Load initial consent from storage
    const loadConsent = () => {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setConsent({
            essential: parsed.essential ?? true,
            analytics: parsed.analytics ?? false,
            marketing: parsed.marketing ?? false,
          });
        } catch {
          setConsent({ essential: true, analytics: false, marketing: false });
        }
      }
    };
    
    loadConsent();

    // Listen for consent changes from the banner
    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<CookiePreferences>;
      setConsent(customEvent.detail);
    };

    window.addEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
    };
  }, []);

  return consent;
};

export default CookieConsent;
