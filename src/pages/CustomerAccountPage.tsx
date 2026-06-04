import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { hasPlatformAuthenticator, registerPasskey } from '@/lib/webauthn';
import Header from '@/components/Header';
import { Coffee, Fingerprint, Gift, LogOut, ShieldCheck } from 'lucide-react';

const DEFAULT_THRESHOLD = 10;

interface PasskeyCredential {
  id: string;
  device_label: string | null;
  created_at: string;
}

const CustomerAccountPage = () => {
  const { user, signOut } = useCustomerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loadingData, setLoadingData] = useState(true);
  const [paidCount, setPaidCount] = useState(0);
  const [freeDrinks, setFreeDrinks] = useState(0);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [canAddPasskey, setCanAddPasskey] = useState(false);
  const [addingPasskey, setAddingPasskey] = useState(false);

  const loadData = async () => {
    if (!user) return;

    const [{ data: loyalty }, { data: profile }, { data: setting }, { data: creds }] =
      await Promise.all([
        supabase.from('loyalty_accounts')
          .select('paid_beverage_count, free_drinks_available')
          .eq('user_id', user.id).maybeSingle(),
        supabase.from('customer_profiles')
          .select('full_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('kitchen_settings')
          .select('setting_value').eq('setting_key', 'loyalty_threshold').maybeSingle(),
        supabase.from('webauthn_credentials')
          .select('id, device_label, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

    setPaidCount(loyalty?.paid_beverage_count ?? 0);
    setFreeDrinks(loyalty?.free_drinks_available ?? 0);
    setProfileName(profile?.full_name ?? null);
    const t = Number(setting?.setting_value);
    if (Number.isFinite(t) && t > 0) setThreshold(t);
    const rawCreds = (creds ?? []) as Array<{ id: string; device_label: string | null; created_at: string }>;
    setCredentials(rawCreds);
    setLoadingData(false);
  };

  useEffect(() => {
    let mounted = true;
    if (!user) return;
    loadData();

    // Check if this device can enroll a passkey.
    hasPlatformAuthenticator().then((ok) => { if (mounted) setCanAddPasskey(ok); });
    return () => { mounted = false; };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out' });
    navigate('/', { replace: true });
  };

  const handleAddPasskey = async () => {
    setAddingPasskey(true);
    try {
      const label = /iPhone|iPad/.test(navigator.userAgent)
        ? 'iPhone / iPad'
        : /Android/.test(navigator.userAgent)
        ? 'Android phone'
        : 'This device';
      await registerPasskey(label);
      toast({ title: 'Device added!', description: 'You can now sign in with Face ID or fingerprint.' });
      loadData(); // Refresh credentials list
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not add device',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setAddingPasskey(false);
    }
  };

  const progressToNext = paidCount % threshold;
  const remaining = threshold - progressToNext;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-2xl space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-coffee-900">
              Hello{profileName ? `, ${profileName}` : ''}
            </h1>
            <p className="text-coffee-700">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>

        {/* Free-drink banner */}
        {freeDrinks > 0 && (
          <Card className="border-0 shadow-lg bg-coffee-700 text-white">
            <CardContent className="flex items-center gap-4 py-6">
              <Gift className="w-10 h-10 shrink-0" />
              <div>
                <p className="text-xl font-bold">
                  You have {freeDrinks} free drink{freeDrinks > 1 ? 's' : ''}! 🎉
                </p>
                <p className="text-cream-100">Auto-applied at your next checkout.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loyalty progress */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-primary" /> Your rewards
            </CardTitle>
            <CardDescription>Buy {threshold} beverages, get the next one free.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingData ? (
              <div className="h-6 w-full animate-pulse rounded bg-muted" />
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-coffee-900">{progressToNext}</span>
                  <span className="text-muted-foreground">of {threshold} beverages</span>
                </div>
                <Progress value={(progressToNext / threshold) * 100} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {remaining === threshold
                    ? `Buy ${threshold} beverages to earn a free drink.`
                    : `${remaining} more beverage${remaining > 1 ? 's' : ''} until your next free drink.`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Biometric / passkey management */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Sign-in security
            </CardTitle>
            <CardDescription>
              Devices with Face ID or fingerprint enrolled for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingData ? (
              <div className="h-12 w-full animate-pulse rounded bg-muted" />
            ) : credentials.length === 0 ? (
              <p className="text-sm text-muted-foreground">No biometric devices added yet.</p>
            ) : (
              credentials.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <Fingerprint className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">{c.device_label || 'Device'}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {canAddPasskey && (
              <Button
                variant="outline"
                className="w-full gap-2 mt-2"
                onClick={handleAddPasskey}
                disabled={addingPasskey}
              >
                <Fingerprint className="w-4 h-4" />
                {addingPasskey ? 'Setting up…' : 'Add Face ID / Fingerprint for this device'}
              </Button>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default CustomerAccountPage;
