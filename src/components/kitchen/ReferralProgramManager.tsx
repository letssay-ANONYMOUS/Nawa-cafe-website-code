import { useEffect, useState } from 'react';
import { Save, Users } from 'lucide-react';
import { useReferralProgram, type ReferralProgramConfig } from '@/hooks/useReferralProgram';
import { useLoyaltyProgram } from '@/hooks/useLoyaltyProgram';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function ReferralProgramManager() {
  const { toast } = useToast();
  const { config, loading, save, saving } = useReferralProgram();
  const { config: loyalty } = useLoyaltyProgram();
  const [draft, setDraft] = useState<ReferralProgramConfig>(config);

  useEffect(() => setDraft(config), [config]);

  const handleSave = async () => {
    if (draft.stampsPerReferral < 0 || draft.friendStamps < 0) {
      toast({ variant: 'destructive', title: 'Stamps cannot be negative' });
      return;
    }
    try {
      await save(draft);
      toast({ title: 'Referral programme updated', description: 'Customer stamp totals were recalculated.' });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not save referral settings',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const referralsForFree = draft.stampsPerReferral > 0
    ? Math.ceil(loyalty.threshold / draft.stampsPerReferral)
    : null;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Referral programme
            </CardTitle>
            <CardDescription className="mt-1">
              Customers share a personal code. Stamps are awarded only after the invited friend
              completes their first paid order, so fake signups earn nothing.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.enabled}
              disabled={loading || saving}
              onCheckedChange={(enabled) => setDraft((current) => ({ ...current, enabled }))}
            />
            <Badge variant={draft.enabled ? 'default' : 'outline'}>
              {draft.enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="referral-stamps">Stamps for the referrer</Label>
            <Input
              id="referral-stamps"
              type="number"
              min={0}
              max={50}
              step={1}
              value={draft.stampsPerReferral}
              onChange={(event) => setDraft((current) => ({
                ...current,
                stampsPerReferral: Number(event.target.value),
              }))}
            />
            <p className="text-xs text-muted-foreground">Earned per friend who completes a first order.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="referral-friend-stamps">Welcome stamps for the friend</Label>
            <Input
              id="referral-friend-stamps"
              type="number"
              min={0}
              max={50}
              step={1}
              value={draft.friendStamps}
              onChange={(event) => setDraft((current) => ({
                ...current,
                friendStamps: Number(event.target.value),
              }))}
            />
            <p className="text-xs text-muted-foreground">Given to the invited customer on their first order.</p>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-4 text-sm">
          {referralsForFree
            ? <>With a {loyalty.threshold}-stamp card, a customer earns a free item after{' '}
                <strong>{referralsForFree} referral{referralsForFree === 1 ? '' : 's'}</strong>.</>
            : <>Referrers currently earn no stamps — set a value above zero to reward them.</>}
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button onClick={handleSave} disabled={loading || saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save referral programme'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReferralProgramManager;
