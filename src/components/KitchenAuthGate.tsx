import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

interface KitchenAuthGateProps {
  children: React.ReactNode;
}

/**
 * KitchenAuthGate — simplified.
 *
 * KEY FIX: We never call refreshSession() manually. The Supabase client has
 * autoRefreshToken: true — it refreshes the access token in the background
 * ~60 s before expiry. Calling refreshSession() from multiple components at
 * the same time revokes tokens and kills the session. Trust the client.
 */
const KitchenAuthGate = ({ children }: KitchenAuthGateProps) => {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const verifyAccess = async () => {
      try {
        // getSession() returns the cached session; the client auto-refreshes it.
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (mountedRef.current) {
            setLoading(false);
            navigate('/staff/login', { replace: true });
          }
          return;
        }

        // Verify role with a 5-second timeout
        const rolesPromise = Promise.all([
          supabase.rpc('has_role', { _user_id: session.user.id, _role: 'staff' }),
          supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' }),
        ]);
        const timeoutPromise = new Promise<[any, any]>((resolve) =>
          setTimeout(() => resolve([{ data: null }, { data: null }]), 5000)
        );

        const [staffRes, adminRes] = await Promise.race([rolesPromise, timeoutPromise]);

        if (staffRes.data !== true && adminRes.data !== true) {
          await supabase.auth.signOut();
          if (mountedRef.current) {
            setLoading(false);
            navigate('/staff/login', { replace: true });
          }
          return;
        }

        if (mountedRef.current) {
          setAuthorized(true);
          setLoading(false);
        }
      } catch (err) {
        console.error('KitchenAuthGate: Auth verification failed:', err);
        if (mountedRef.current) {
          setLoading(false);
          navigate('/staff/login', { replace: true });
        }
      }
    };

    void verifyAccess();

    // Listen for auth changes — NO async, NO manual refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (mountedRef.current) {
          setAuthorized(false);
          navigate('/staff/login', { replace: true });
        }
      }
      if (event === 'TOKEN_REFRESHED') {
        // Token was auto-refreshed by the client; re-verify role if needed
        if (!authorized && mountedRef.current) {
          void verifyAccess();
        }
      }
    });

    // Re-verify when tab becomes visible (iPad sleep/wake)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        void verifyAccess();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
};

export default KitchenAuthGate;
