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
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!newSession) {
          setSession(null);
          setAuthorized(false);
          navigate('/staff/login');
          return;
        }
        setSession(newSession);
        // Check role
        setTimeout(async () => {
          const { data: roles } = await (supabase as any)
            .from('user_roles')
            .select('role')
            .eq('user_id', newSession.user.id);

          const hasAccess = roles?.some((r: any) => r.role === 'staff' || r.role === 'admin');
          if (hasAccess) {
            setAuthorized(true);
          } else {
            await supabase.auth.signOut();
            navigate('/staff/login');
          }
          setLoading(false);
        }, 0);
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (!existingSession) {
        setLoading(false);
        navigate('/staff/login');
        return;
      }
      setSession(existingSession);

      const { data: roles } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', existingSession.user.id);

      const hasAccess = roles?.some((r: any) => r.role === 'staff' || r.role === 'admin');
      if (hasAccess) {
        setAuthorized(true);
      } else {
        await supabase.auth.signOut();
        navigate('/staff/login');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
