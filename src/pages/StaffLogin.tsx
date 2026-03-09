import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChefHat, Lock, Mail } from "lucide-react";

const StaffLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const hasKitchenAccess = useCallback(async (userId: string): Promise<boolean | null> => {
    try {
      // Use security definer function to bypass RLS timing issues
      const [staffResult, adminResult] = await Promise.all([
        supabase.rpc('has_role', { _user_id: userId, _role: 'staff' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
      ]);

      if (staffResult.error && adminResult.error) {
        console.error('Role validation error:', staffResult.error, adminResult.error);
        return null;
      }
      return staffResult.data === true || adminResult.data === true;
    } catch (err) {
      console.error('Role validation exception:', err);
      return null;
    }
  }, []);

  // On mount only: check if already logged in with valid role → redirect
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted || !session) {
          if (mounted) setCheckingSession(false);
          return;
        }

        const hasAccess = await hasKitchenAccess(session.user.id);
        if (!mounted) return;

        if (hasAccess === true) {
          navigate('/admin/kitchen', { replace: true });
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => {
        if (mounted) setCheckingSession(false);
      });

    return () => { mounted = false; };
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

        if (hasAccess !== true) {
          if (hasAccess === false) {
            await supabase.auth.signOut();
          }
          throw new Error(
            hasAccess === null
              ? 'Access verification is temporarily unavailable. Please try again.'
              : 'You do not have kitchen staff access.'
          );
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

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
