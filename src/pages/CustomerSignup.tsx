import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { hasPlatformAuthenticator, registerPasskey } from '@/lib/webauthn';
import EmailVerificationStep from '@/components/EmailVerificationStep';
import { Coffee, Fingerprint, Lock, Mail, Phone, User, Users } from 'lucide-react';

type Step = 'form' | 'verify-email' | 'passkey-prompt';

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
  const [searchParams] = useSearchParams();
  // Referral link: /signup?ref=abc123
  const [referralCode, setReferralCode] = useState(
    (searchParams.get('ref') ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6),
  );

  useEffect(() => {
    if (!loading && !isLoading && user && step === 'form') navigate('/account', { replace: true });
  }, [loading, isLoading, user, step, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 10) {
      toast({ variant: 'destructive', title: 'Weak password', description: 'Use at least 10 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match', description: 'Please re-enter to confirm.' });
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email, password, fullName.trim() || undefined, phone.trim() || undefined);

      // Apply the referral code, if one came in on the link or was typed in.
      // Non-fatal: a bad code must never block account creation.
      if (referralCode.length === 6) {
        try {
          const { data, error } = await supabase.functions.invoke('claim-referral', {
            body: { code: referralCode },
          });
          if (error || data?.error) throw new Error(data?.error || 'Could not apply referral code.');
          toast({ title: 'Referral applied', description: `Code ${referralCode} is linked to your account.` });
        } catch (referralError: unknown) {
          toast({
            variant: 'destructive',
            title: 'Referral code not applied',
            description: referralError instanceof Error ? referralError.message : 'Your account was still created.',
          });
        }
      }

      // Confirm the email address with a code before finishing setup.
      setStep('verify-email');
      setIsLoading(false);
      return;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      toast({
        variant: 'destructive',
        title: 'Could not create account',
        description: message,
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'You can add it later from your account.';
      // Non-fatal — account is already created; just skip passkey.
      toast({
        variant: 'destructive',
        title: 'Passkey not added',
        description: message,
      });
    } finally {
      setIsLoading(false);
      toast({ title: 'Welcome!', description: 'Account ready.' });
      navigate('/account', { replace: true });
    }
  };

  const handleVerificationContinue = async () => {
    // After confirming, offer passkey enrollment when the device supports it.
    try {
      if (await hasPlatformAuthenticator()) {
        setStep('passkey-prompt');
        return;
      }
    } catch {
      /* biometric probe failed — just finish */
    }
    navigate('/account', { replace: true });
  };

  if (step === 'verify-email') {
    return <EmailVerificationStep email={email} onContinue={handleVerificationContinue} />;
  }

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
                placeholder="At least 10 characters" required className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <Lock className="w-4 h-4" /> Confirm password
              </Label>
              <Input id="confirmPassword" type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Referral code <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="referralCode"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6))}
                placeholder="Friend's code"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-12 font-mono tracking-[0.2em] lowercase"
              />
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
