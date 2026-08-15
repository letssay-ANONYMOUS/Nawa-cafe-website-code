import { useEffect, useRef, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Props {
  email: string;
  onVerified: () => void;
  onSkip?: () => void;
}

const RESEND_COOLDOWN = 60;

export function EmailVerificationStep({ email, onVerified, onSkip }: Props) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const requestedRef = useRef(false);

  const sendCode = async (isResend: boolean) => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code');
      if (error) throw error;
      if (data?.alreadyVerified) {
        onVerified();
        return;
      }
      if (data?.error) throw new Error(data.error);
      setCooldown(RESEND_COOLDOWN);
      if (isResend) {
        toast({ title: 'Code sent', description: `A new code is on its way to ${email}.` });
      }
    } catch (error: unknown) {
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
    if (code.length !== 6) {
      toast({ variant: 'destructive', title: 'Enter all 6 digits' });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-code', {
        body: { code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.verified) throw new Error('Could not confirm your email.');

      toast({ title: 'Email confirmed', description: 'Your Nawa Cafe account is ready.' });
      onVerified();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Confirm your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
            Enter it below to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-label="6-digit confirmation code"
              autoFocus
              className="h-14 text-center text-2xl font-semibold tracking-[0.4em] tabular-nums"
            />
            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold"
              disabled={submitting || code.length !== 6}
            >
              {submitting ? 'Confirming…' : 'Confirm email'}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="text-sm"
              disabled={sending || cooldown > 0}
              onClick={() => void sendCode(true)}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : sending ? 'Sending…' : 'Resend code'}
            </Button>
            {onSkip && (
              <Button type="button" variant="ghost" className="text-xs text-muted-foreground" onClick={onSkip}>
                I'll confirm later
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EmailVerificationStep;
