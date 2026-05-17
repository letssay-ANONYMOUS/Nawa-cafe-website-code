import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShoppingCart, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getVisitorId } from '@/hooks/useVisitorId';

interface SharedCartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
}

interface SharedPayment {
  id: string;
  cart: SharedCartItem[];
  sender_name: string | null;
  notes: string | null;
  subtotal: number;
  total: number;
  paid_order_id: string | null;
  expires_at: string;
}

const SharedPaymentPage = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sp, setSp] = useState<SharedPayment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setError('Invalid link');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('shared_payments')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setError('This payment link is invalid or has been removed.');
      } else {
        const row = data as any as SharedPayment;
        if (new Date(row.expires_at).getTime() < Date.now()) {
          setError('This payment link has expired.');
        } else {
          setSp({ ...row, cart: Array.isArray(row.cart) ? row.cart : [] });
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePay = async () => {
    if (!sp) return;
    if (!name.trim() || !phone.trim()) {
      toast({ title: 'Please enter your name and phone', variant: 'destructive' });
      return;
    }
    setPaying(true);
    try {
      const orderItems = sp.cart.map((c) => ({
        name: c.name,
        quantity: c.quantity,
        price: c.price,
        category: c.category || null,
      }));
      const { data, error } = await supabase.functions.invoke('create-ziina-checkout', {
        body: {
          customerName: name.trim(),
          phoneNumber: phone.trim(),
          orderItems,
          additionalNotes: sp.notes
            ? `[Shared payment from ${sp.sender_name || 'a friend'}] ${sp.notes}`
            : `[Shared payment from ${sp.sender_name || 'a friend'}]`,
          visitorId: getVisitorId(),
          sharedPaymentId: sp.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error.message || 'Payment failed');
      if (data?.url) {
        // Link the order back to the shared payment (best-effort)
        if (data.orderId) {
          supabase
            .from('shared_payments')
            .update({ paid_order_id: data.orderId })
            .eq('id', sp.id)
            .then(() => {});
        }
        window.location.href = data.url;
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (e: any) {
      toast({
        title: 'Payment could not be started',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <section className="relative pt-16 pb-12 bg-gradient-to-br from-coffee-800 to-coffee-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-white mb-2">
            Pay for an Order
          </h1>
          <p className="text-cream-100">Nawa Cafe — Shared payment</p>
        </div>
      </section>

      <section className="py-12 bg-cream-50">
        <div className="container mx-auto px-4 max-w-3xl">
          {loading ? (
            <div className="text-center py-16 text-coffee-700">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
              Loading order…
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-coffee-800 mb-2">Link unavailable</h2>
                <p className="text-coffee-600 mb-6">{error}</p>
                <Link to="/menu">
                  <Button className="bg-coffee-600 hover:bg-coffee-700">Browse Menu</Button>
                </Link>
              </CardContent>
            </Card>
          ) : sp?.paid_order_id ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-coffee-800 mb-2">Already paid</h2>
                <p className="text-coffee-600">This shared order has already been paid for.</p>
              </CardContent>
            </Card>
          ) : sp ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card className="md:col-span-3">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-coffee-800 mb-1 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> Order Summary
                  </h2>
                  {sp.sender_name && (
                    <p className="text-sm text-coffee-600 mb-4">
                      From <span className="font-medium">{sp.sender_name}</span>
                    </p>
                  )}
                  {sp.notes && (
                    <p className="text-sm italic text-coffee-700 bg-cream-100 rounded-md p-3 mb-4">
                      “{sp.notes}”
                    </p>
                  )}
                  <ul className="divide-y divide-coffee-100">
                    {sp.cart.map((item, idx) => (
                      <li key={idx} className="py-3 flex items-center gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-14 h-14 rounded-md object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-coffee-800 truncate">{item.name}</p>
                          <p className="text-sm text-coffee-600">
                            AED {Number(item.price).toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-coffee-800">
                          AED {(Number(item.price) * item.quantity).toFixed(2)}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-coffee-200 mt-4 pt-4 space-y-1 text-sm">
                    <div className="flex justify-between text-coffee-700">
                      <span>Subtotal</span>
                      <span>AED {Number(sp.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-coffee-800 border-t border-coffee-200 pt-2">
                      <span>Total to pay</span>
                      <span>AED {Number(sp.total).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-coffee-500 pt-2">
                      Final amount may include loyalty discount applied at checkout.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 h-fit md:sticky md:top-8">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-coffee-800 mb-4">Your details</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="payer-name">Full name</Label>
                      <Input
                        id="payer-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="payer-phone">Phone</Label>
                      <Input
                        id="payer-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+971 …"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handlePay}
                    disabled={paying}
                    size="lg"
                    className="w-full mt-5 bg-coffee-600 hover:bg-coffee-700"
                  >
                    {paying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…
                      </>
                    ) : (
                      <>Pay AED {Number(sp.total).toFixed(2)}</>
                    )}
                  </Button>
                  <p className="text-xs text-coffee-500 mt-3 text-center">
                    Secure payment via Ziina.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default SharedPaymentPage;
