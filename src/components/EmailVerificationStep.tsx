import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Coffee, MailCheck, Sparkles, Stamp, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Props {
  email: string;
  onContinue: () => void;
}

const RESEND_COOLDOWN = 60;
const CODE_LENGTH = 6;

/** Ring of dots that orbit while the confirmation email is being sent. */
function OrbitLoader() {
  const dots = Array.from({ length: 8 });
  return (
    <span className="relative inline-flex h-16 w-16" role="status" aria-label="Sending confirmation email">
      <span className="absolute inset-0 animate-spin" style={{ animationDuration: '1.4s' }}>
        {dots.map((_, index) => {
          const angle = (index / dots.length) * 2 * Math.PI;
          const radius = 26;
          return (
            <span
              key={index}
              className="absolute h-2 w-2 rounded-full bg-primary"
              style={{
                left: `calc(50% + ${Math.cos(angle) * radius}px - 0.25rem)`,
                top: `calc(50% + ${Math.sin(angle) * radius}px - 0.25rem)`,
                opacity: 0.15 + (index / dots.length) * 0.85,
              }}
            />
          );
        })}
      </span>
    </span>
  );
}

export function EmailVerificationStep({ email, onContinue }: Props) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<'sending' | 'entry' | 'confirmed'>('sending');
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const requestedRef = useRef(false);

  const sendCode = async (isResend: boolean) => {
    setSending(true);
    if (!isResend) setPhase('sending');
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code');
      if (error) throw error;
      if (data?.alreadyVerified) {
        setPhase('confirmed');
        return;
      }
      if (data?.error) throw new Error(data.error);
      setCooldown(RESEND_COOLDOWN);
      setPhase('entry');
      if (isResend) {
        toast({ title: 'New code sent', description: `Check ${email} for your new code.` });
      }
    } catch (error: unknown) {
      setPhase('entry');
      toast({
        variant: 'destructive',
        title: 'Could not send the code',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  // Send the first code automatically when this step mounts (once).
  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    void sendCode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== CODE_LENGTH) {
      toast({ variant: 'destructive', title: `Enter all ${CODE_LENGTH} characters` });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-code', { body: { code } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.verified) throw new Error('Could not confirm your email.');
      setPhase('confirmed');
    } catch (error: unknown) {
      setCode('');
      toast({
        variant: 'destructive',
        title: 'Confirmation failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">{children}</Card>
    </div>
  );

  if (phase === 'sending') {
    return shell(
      <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
        <OrbitLoader />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Sending your confirmation email…</h2>
          <p className="text-sm text-muted-foreground">
            We're sending a confirmation code to{' '}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>
      </CardContent>,
    );
  }

  if (phase === 'confirmed') {
    return shell(
      <>
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Email confirmed — account created</CardTitle>
          <CardDescription>
            Welcome to Nawa Cafe. Your rewards account is active and ready to use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="mb-3 text-sm font-semibold">Here's what you get</p>
            <ul className="space-y-3">
              <Benefit
                icon={<Stamp className="h-4 w-4" />}
                title="Digital stamp card"
                detail="Collect a stamp on every qualifying order and claim a free item once your card is full."
              />
              <Benefit
                icon={<Zap className="h-4 w-4" />}
                title="Faster checkout"
                detail="Your details are saved for pickup, delivery and dine-in orders."
              />
              <Benefit
                icon={<Sparkles className="h-4 w-4" />}
                title="Member offers"
                detail="Seasonal discounts and new-menu previews reach your account first."
              />
              <Benefit
                icon={<Users className="h-4 w-4" />}
                title="Referral rewards"
                detail="Share your code — you earn bonus stamps once a friend completes their first order."
              />
            </ul>
          </div>
          <Button onClick={onContinue} className="h-12 w-full text-lg font-semibold">
            <Coffee className="mr-2 h-5 w-5" />
            Start ordering
          </Button>
        </CardContent>
      </>,
    );
  }

  return shell(
    <>
      <CardHeader className="text-center space-y-4 pb-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Check your inbox</CardTitle>
        <CardDescription>
          A confirmation email was sent to <span className="font-medium text-foreground">{email}</span>.
          Enter the {CODE_LENGTH}-character code below to confirm your email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            value={code}
            onChange={(event) => setCode(
              event.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, CODE_LENGTH),
            )}
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="one-time-code"
            placeholder="abc123"
            aria-label={`${CODE_LENGTH}-character confirmation code`}
            autoFocus
            className="h-14 text-center font-mono text-2xl font-semibold lowercase tracking-[0.4em]"
          />
          <Button
            type="submit"
            className="h-12 w-full text-lg font-semibold"
            disabled={submitting || code.length !== CODE_LENGTH}
          >
            {submitting ? 'Confirming…' : 'Confirm email'}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-1 pt-1">
          <Button
            type="button"
            variant="ghost"
            className="text-sm"
            disabled={sending || cooldown > 0}
            onClick={() => void sendCode(true)}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : sending ? 'Sending…' : "Didn't get it? Resend code"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            The code expires in 10 minutes. Check your spam folder if it hasn't arrived.
          </p>
        </div>
      </CardContent>
    </>,
  );
}

function Benefit({
  icon,
  title,
  detail,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  badge?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {badge && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}

export default EmailVerificationStep;
