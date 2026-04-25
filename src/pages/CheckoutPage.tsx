import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Lock, MapPin } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getVisitorId } from '@/hooks/useVisitorId';
import { useAnalytics } from '@/hooks/useAnalytics';

const FIXED_BRANCH = 'Stadhazza Branch';

const CheckoutPage = () => {
  const { toast } = useToast();
  const { cartItems, getCartTotal, getCartCount, clearCart } = useCart();
  const navigate = useNavigate();
  const { trackCheckoutStart, trackCheckoutComplete } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
  });

  const subtotal = getCartTotal();
  const discount = subtotal * 0.15;
  const total = subtotal - discount;
  const itemCount = getCartCount();

  // Track checkout start when page loads with items
  useEffect(() => {
    if (cartItems.length > 0) {
      trackCheckoutStart(total, itemCount);
    }
  }, []);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Please add items to your cart before checkout.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-ziina-checkout', {
        body: {
          customerName: formData.name,
          phoneNumber: formData.phone,
          visitorId: getVisitorId(),
          latitude: null,
          longitude: null,
          selectedBranch: FIXED_BRANCH,
          orderItems: cartItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            category: item.category,
          })),
          additionalNotes: formData.notes || "None",
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.error) {
        const msg = data?.error?.message || "Unable to process payment. Please try again.";
        const code = data?.error?.code ? ` (${data.error.code})` : "";
        const status = data?.error?.account?.status ? ` Account status: ${data.error.account.status}.` : "";
        throw new Error(`${msg}${code}${status}`);
      }

      console.log('Ziina payment intent created:', data);

      if (!data?.url) {
        throw new Error('No redirect URL received from Ziina');
      }

      trackCheckoutComplete({
        orderId: data.paymentId || 'unknown',
        total: total,
        itemCount: itemCount
      });

      // Store payment URL for the pending page, then navigate
      sessionStorage.setItem('ziina_payment_url', data.url);

      // Try opening Ziina in a new tab
      window.open(data.url, '_blank', 'noopener,noreferrer');

      setLoading(false);

      // Navigate to the pending page that polls for payment status
      navigate(`/payment-pending?order_id=${data.orderId || 'unknown'}`);

    } catch (error) {
      console.error('Error creating payment:', error);
      setLoading(false);
      toast({
        title: "Payment Error",
        description: (error as Error).message || "Unable to process payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-12 bg-gradient-to-br from-coffee-800 to-coffee-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-playfair text-4xl md:text-6xl font-bold text-white mb-4">
            Checkout
          </h1>
          <p className="text-lg md:text-xl text-cream-100 max-w-2xl mx-auto">
            Complete your order securely
          </p>
        </div>
      </section>

      {/* Checkout Content */}
      <section className="py-12 md:py-20 bg-cream-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Checkout Form */}
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-6">
                      <Lock className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-coffee-600">Secure payment powered by Ziina</span>
                    </div>

                    {/* Branch Location */}
                    <div className="mb-6 rounded-lg border border-coffee-200 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-5 h-5 text-coffee-600" />
                        <span className="font-medium text-coffee-800">Branch</span>
                      </div>
                      <div className="text-sm text-coffee-700 ml-7">{FIXED_BRANCH}</div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold text-coffee-800 mb-4">
                          Customer Details
                        </h2>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              name="name"
                              required
                              value={formData.name}
                              onChange={handleInputChange}
                              placeholder="John Doe"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              required
                              value={formData.phone}
                              onChange={handleInputChange}
                              placeholder="+971 50 123 4567"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="notes">Additional Notes (Optional)</Label>
                            <Textarea
                              id="notes"
                              name="notes"
                              value={formData.notes}
                              onChange={handleInputChange}
                              placeholder="Special requests, delivery instructions, etc."
                              className="mt-1 min-h-[80px]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-cream-100 p-4 rounded-lg">
                        <p className="text-sm text-coffee-700 mb-2">
                          You'll be redirected to Ziina's secure payment page where you can pay with:
                        </p>
                        <ul className="text-sm text-coffee-600 list-disc list-inside space-y-1">
                          <li>Credit/Debit Card</li>
                          <li>Apple Pay <span className="text-coffee-500">(on supported Apple devices)</span></li>
                          <li>Google Pay <span className="text-coffee-500">(on supported Android devices)</span></li>
                        </ul>
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="w-full bg-coffee-600 hover:bg-coffee-700"
                      >
                        {loading ? 'Processing...' : `Proceed to Payment - AED ${total.toFixed(2)}`}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-8">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-semibold text-coffee-800 mb-6">Order Summary</h2>
                    {cartItems.length === 0 ? (
                      <p className="text-coffee-600 text-center py-8">Your cart is empty</p>
                    ) : (
                      <div className="space-y-4 mb-6">
                        <div className="space-y-3">
                          {cartItems.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-coffee-700">{item.name} × {item.quantity}</span>
                              <span className="text-coffee-700">AED {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-coffee-200 pt-4 space-y-2">
                          <div className="flex justify-between text-sm text-coffee-700">
                            <span>Subtotal</span>
                            <span>AED {subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-green-600 font-medium">
                            <span>Discount (15%)</span>
                            <span>-AED {discount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-semibold text-coffee-800 border-t border-coffee-200 pt-2">
                            <span>Total</span>
                            <span>AED {total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
