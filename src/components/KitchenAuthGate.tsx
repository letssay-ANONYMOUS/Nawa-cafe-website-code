import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

interface KitchenAuthGateProps {
  children: React.ReactNode;
}

const KitchenAuthGate = ({ children }: KitchenAuthGateProps) => {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const verifyAccess = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          if (mountedRef.current) {
            setLoading(false);
            navigate('/staff/login', { replace: true });
          }
          return;
        }

        const [staffRes, adminRes] = await Promise.all([
          supabase.rpc('has_role', { _user_id: session.user.id, _role: 'staff' }),
          supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' }),
        ]);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (mountedRef.current) {
          setAuthorized(false);
          navigate('/staff/login', { replace: true });
        }
      }
    });

    return () => {
      mountedRef.current = false;
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

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
};

export default KitchenAuthGate;
