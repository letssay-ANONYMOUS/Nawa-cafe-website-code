import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

interface KitchenAuthGateProps {
  children: React.ReactNode;
}

const KitchenAuthGate = ({ children }: KitchenAuthGateProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let authResolved = false;
    let safetyTimeout: ReturnType<typeof setTimeout> | undefined;

    const finishLoading = () => {
      if (!mounted || authResolved) return;
      authResolved = true;
      setLoading(false);
      if (safetyTimeout) clearTimeout(safetyTimeout);
    };

    const redirectToLogin = () => {
      if (!mounted) return;
      setSession(null);
      setAuthorized(false);
      finishLoading();
      navigate('/staff/login', { replace: true });
    };

    const checkRole = async (userId: string): Promise<boolean> => {
      try {
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .in('role', ['staff', 'admin'])
          .limit(1);

        if (error) {
          console.error('Role check error:', error);
          return false;
        }

        return (roles?.length ?? 0) > 0;
      } catch (err) {
        console.error('Role check exception:', err);
        return false;
      }
    };

    const validateSessionAccess = async (activeSession: Session | null) => {
      if (!activeSession) {
        redirectToLogin();
        return;
      }

      setSession(activeSession);

      const hasAccess = await checkRole(activeSession.user.id);
      if (!mounted) return;

      if (hasAccess) {
        setAuthorized(true);
        finishLoading();
        return;
      }

      await supabase.auth.signOut();
      redirectToLogin();
    };

    safetyTimeout = setTimeout(() => {
      if (!mounted || authResolved) return;
      console.error('KitchenAuthGate: Loading timed out after 8s');
      redirectToLogin();
    }, 8000);

    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession } }) => {
        void validateSessionAccess(existingSession);
      })
      .catch((err) => {
        console.error('getSession error:', err);
        redirectToLogin();
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        redirectToLogin();
        return;
      }

      if (event === 'SIGNED_IN') {
        void validateSessionAccess(newSession);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && newSession) {
        setSession(newSession);
      }
    });

    return () => {
      mounted = false;
      if (safetyTimeout) clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || !authorized) {
    return null;
  }

  return <>{children}</>;
};

export default KitchenAuthGate;