import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChefHat, Lock, Mail } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

const StaffLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const hasKitchenAccess = useCallback(async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['staff', 'admin'])
      .limit(1);

    if (error) {
      console.error('Role validation failed:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  }, []);

  // Redirect only authorized staff/admin sessions
  useEffect(() => {
    let mounted = true;

    const routeIfAuthorized = async (session: Session | null) => {
      if (!mounted || !session) return;

      const hasAccess = await hasKitchenAccess(session.user.id);
      if (!mounted) return;

      if (hasAccess) {
        navigate('/admin/kitchen', { replace: true });
        return;
      }

      await supabase.auth.signOut();
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        void routeIfAuthorized(session);
      })
      .catch((err) => {
        console.error('Staff login session check failed:', err);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        void routeIfAuthorized(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hasKitchenAccess, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        const hasAccess = await hasKitchenAccess(data.session.user.id);

        if (!hasAccess) {
          await supabase.auth.signOut();
          throw new Error('You do not have kitchen staff access.');
        }

        toast({
          title: "Welcome!",
          description: "Redirecting to kitchen dashboard...",
        });
        navigate('/admin/kitchen', { replace: true });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Kitchen Staff Login</CardTitle>
          <CardDescription>
            Sign in with your staff account to access the kitchen dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                required
                className="h-12 text-lg"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="h-12 text-lg"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Access Kitchen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffLogin;
