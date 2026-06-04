import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { hasPlatformAuthenticator, assertPasskey, getPasskeyCount } from '@/lib/webauthn';
import { Coffee, Fingerprint, Lock, Mail } from 'lucide-react';

type Step = 'password' | 'biometric';

const CustomerLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<Step>('password');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signOut, user, loading } = useCustomerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Already signed in → go to account
  useEffect(() => {
    if (!loading && user && step === 'password') navigate('/account', { replace: true });
  }, [loading, user, step, navigate]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);

      // After password succeeds, check if this device supports biometric AND
      // the user has a registered passkey. If both → require biometric.
      const [hasHardware, passkeyCount] = await Promise.all([
        hasPlatformAuthenticator(),
        // user is now set via onAuthStateChange; pull count from context user
        supabase_getCount(),
      ]);

      if (hasHardware && passkeyCount > 0) {
        setStep('biometric');
        setIsLoading(false);
        return;
      }

      // Desktop / no passkey enrolled → password is enough
      navigate('/account', { replace: true });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error?.message || 'Invalid email or password.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Lazy import to avoid calling supabase before the module is loaded.
  const supabase_getCount = async (): Promise<number> => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    return getPasskeyCount(user.id);
  };

  const handleBiometric = async () => {
    setIsLoading(true);
    try {
      await assertPasskey();
      toast({ title: 'Verified!', description: 'Welcome back.' });
      navigate('/account', { replace: true });
    } catch (error: any) {
      // Biometric failed → sign out to avoid leaving a dangling partial session.
      await signOut();
      setStep('password');
      toast({
        variant: 'destructive',
        title: 'Biometric failed',
        description: error?.message || 'Could not verify. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBiometric = async () => {
    await signOut();
    setStep('password');
  };

  if (step === 'biometric') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Fingerprint className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Confirm it's you</CardTitle>
            <CardDescription>
              Tap the button below and use Face ID or your fingerprint to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleBiometric}
              className="w-full h-12 text-lg font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Waiting for biometric…' : 'Use Face ID / Fingerprint'}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleCancelBiometric}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Coffee className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Sign in to Nawa Cafe</CardTitle>
          <CardDescription>Welcome back — sign in to track your rewards.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-12 text-lg"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" /> Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="h-12 text-lg"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            New here?{' '}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerLogin;
