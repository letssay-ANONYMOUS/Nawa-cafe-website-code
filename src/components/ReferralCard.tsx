import { useEffect, useState } from 'react';
import { Check, Copy, Share2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useReferralProgram } from '@/hooks/useReferralProgram';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReferralRow {
  status: string;
}

export function ReferralCard({ userId }: { userId: string }) {
  const { toast } = useToast();
  const { config } = useReferralProgram();
  const [code, setCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: profile }, { data: rows }] = await Promise.all([
        supabase.from('customer_profiles').select('referral_code').eq('user_id', userId).maybeSingle(),
        supabase.from('referrals').select('status').eq('referrer_user_id', userId),
      ]);
      if (!active) return;
      setCode((profile as { referral_code?: string } | null)?.referral_code ?? null);
      setReferrals((rows ?? []) as ReferralRow[]);
    })();
    return () => { active = false; };
  }, [userId]);

  if (!config.enabled || !code) return null;

  const shareUrl = `${window.location.origin}/signup?ref=${code}`;
  const qualified = referrals.filter((r) => r.status === 'qualified').length;
  const pending = referrals.filter((r) => r.status === 'pending').length;
  const stampsEarned = qualified * config.stampsPerReferral;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Link copied', description: 'Send it to a friend to start earning stamps.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy', description: shareUrl });
    }
  };

  const share = async () => {
    const text = `Join me at Nawa Cafe — use my code ${code} when you sign up.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Nawa Cafe', text, url: shareUrl });
        return;
      } catch {
        /* dismissed — fall through to copy */
      }
    }
    void copy();
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-coffee-600" />
          Invite friends
        </CardTitle>
        <CardDescription>
          Your friend gets {config.friendStamps} stamp{config.friendStamps === 1 ? '' : 's'} to start,
          and you earn {config.stampsPerReferral} stamp{config.stampsPerReferral === 1 ? '' : 's'} once
          they complete their first order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/20 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Your referral code
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-[0.3em] text-coffee-800">{code}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={share} className="flex-1 gap-2">
            <Share2 className="h-4 w-4" />
            Share invite
          </Button>
          <Button onClick={copy} variant="outline" className="flex-1 gap-2">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t pt-4 text-center">
          <Stat label="Joined" value={qualified} />
          <Stat label="Pending" value={pending} />
          <Stat label="Stamps earned" value={stampsEarned} />
        </div>

        {pending > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            {pending} friend{pending === 1 ? '' : 's'} signed up — you'll earn stamps once they place
            their first order.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold text-coffee-800 tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default ReferralCard;
