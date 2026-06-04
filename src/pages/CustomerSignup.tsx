import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { hasPlatformAuthenticator, registerPasskey } from '@/lib/webauthn';
import { Coffee, Fingerprint, Lock, Mail, Phone, User } from 'lucide-react';

type Step = 'form' | 'passkey-prompt';

const CustomerSignup = () => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, user, loading } = useCustomerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user && step === 'form') navigate('/account', { replace: true });
  }, [loading, user, step, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({ variant: 'destructive', title: 'Weak password', description: 'Use at least 8 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match', description: 'Please re-enter to confirm.' });
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email, password, fullName.trim() || undefined, phone.trim() || undefined);

      // Check if device supports biometric — if so, offer passkey enrollment.
      const hasBiometric = await hasPlatformAuthenticator();
      if (hasBiometric) {
        setStep('passkey-prompt');
        setIsLoading(false);
        return;
      }

      toast({ title: 'Account created!', description: 'Welcome to Nawa Cafe rewards.' });
      navigate('/account', { replace: true });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not create account',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrollPasskey = async () => {
    setIsLoading(true);
    try {
      const label = /iPhone|iPad/.test(navigator.userAgent)
        ? 'iPhone / iPad'
        : /Android/.test(navigator.userAgent)
        ? 'Android phone'
        : 'This device';
      await registerPasskey(label);
      toast({ title: 'Biometric added!', description: 'You can now sign in with Face ID or fingerprint.' });
    } catch (error: any) {
      // Non-fatal — account is already created; just skip passkey.
      toast({
        variant: 'destructive',
        title: 'Passkey not added',
        description: error?.message || 'You can add it later from your account.',
      });
    } finally {
      setIsLoading(false);
      toast({ title: 'Welcome!', description: 'Account ready.' });
      navigate('/account', { replace: true });
    }
  };

  if (step === 'passkey-prompt') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Fingerprint className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Add Face ID / Fingerprint?</CardTitle>
            <CardDescription>
              Make sign-in faster and safer by using your device's biometric.
              You can always add this later from your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleEnrollPasskey}
              className="w-full h-12 text-lg font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Setting up…' : 'Add Face ID / Fingerprint'}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/account', { replace: true })}
              disabled={isLoading}
            >
              Skip for now
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
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>Earn a free drink — buy 10 beverages, get the 11th free.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="w-4 h-4" /> Full name
              </Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name" className="h-12" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> Phone
              </Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="05x xxx xxxx" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email
              </Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" /> Password
              </Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters" required className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <Lock className="w-4 h-4" /> Confirm password
              </Label>
              <Input id="confirmPassword" type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required className="h-12" />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={isLoading}>
              {isLoading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerSignup;
