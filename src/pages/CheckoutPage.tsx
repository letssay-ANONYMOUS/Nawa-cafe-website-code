import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Banknote, CreditCard, Hash, Lock, Mail, MapPin } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { getVisitorId } from '@/hooks/useVisitorId';
import { useAnalytics } from '@/hooks/useAnalytics';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { useDiscountCode, computeCodeDiscount, round2 } from '@/hooks/useDiscountCode';
import { useLoyaltyDiscount } from '@/hooks/useLoyaltyDiscount';
import DeliveryAreaSelector from '@/components/DeliveryAreaSelector';
import { calculateDeliveryFee, getFulfillmentLabel, useDeliveryArea, useOrderFulfillment } from '@/lib/delivery';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

const FIXED_BRANCH = 'Stadhazza Branch';
const CHECKOUT_FORM_KEY = 'nawa_checkout_form';
const CHECKOUT_PAYMENT_REDIRECT_KEY = 'nawa_checkout_payment_redirect';

const loadStoredForm = () => {
  try {
    const stored = localStorage.getItem(CHECKOUT_FORM_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        name: parsed.name || '',
        phone: parsed.phone || '',
        email: parsed.email || '',
        notes: parsed.notes || '',
        tableNumber: parsed.tableNumber || '',
        paymentMethod: parsed.paymentMethod === 'cash' ? 'cash' : 'online',
      };
    }
  } catch (e) {
    console.error('Failed to load checkout form:', e);
  }
  return { name: '', phone: '', email: '', notes: '', tableNumber: '', paymentMethod: 'online' };
};

const CheckoutPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { cartItems, getCartTotal, getCartCount } = useCart();
  const { user } = useCustomerAuth();
  const accountEmail = user?.email ?? '';
  const { info: discountInfo, code: discountCode } = useDiscountCode();
  const { trackCheckoutStart, trackCheckoutComplete } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(loadStoredForm);
  const [deliveryError, setDeliveryError] = useState('');
  const checkoutStartTracked = useRef(false);
  const { area: deliveryArea } = useDeliveryArea();
  const { fulfillment } = useOrderFulfillment();

  // Persist form data on every change
  useEffect(() => {
    try {
      localStorage.setItem(CHECKOUT_FORM_KEY, JSON.stringify(formData));
    } catch (e) {
      console.error('Failed to save checkout form:', e);
    }
  }, [formData]);

  useEffect(() => {
    if (deliveryArea || fulfillment === 'dine_in') setDeliveryError('');
  }, [deliveryArea, fulfillment]);

  useEffect(() => {
    if (!accountEmail) return;
    setFormData(prev => (prev.email ? prev : { ...prev, email: accountEmail }));
  }, [accountEmail]);

  const { percent: loyaltyPercent } = useLoyaltyDiscount();
  const subtotal = getCartTotal();
  const loyaltyDiscount = round2(subtotal * (loyaltyPercent / 100));
  const codeDiscount = computeCodeDiscount(cartItems, subtotal, discountInfo);
  const delivery = calculateDeliveryFee(deliveryArea, subtotal, fulfillment);
  const deliveryFee = delivery?.fee ?? 0;
  const total = round2(Math.max(0, subtotal - loyaltyDiscount - codeDiscount) + deliveryFee);
  const itemCount = getCartCount();
  const selectedPaymentMethod = fulfillment === 'dine_in' ? formData.paymentMethod : 'online';
  const checkoutEmail = accountEmail || formData.email;

  // Track checkout start when page loads with items
  useEffect(() => {
    if (checkoutStartTracked.current || cartItems.length === 0) return;
    checkoutStartTracked.current = true;
    trackCheckoutStart(total, itemCount);
  }, [cartItems.length, itemCount, total, trackCheckoutStart]);

  useEffect(() => {
    const resetAfterGatewayBack = () => {
      if (!sessionStorage.getItem(CHECKOUT_PAYMENT_REDIRECT_KEY)) return;
      sessionStorage.removeItem(CHECKOUT_PAYMENT_REDIRECT_KEY);
      setLoading(false);
    };

    window.addEventListener('pageshow', resetAfterGatewayBack);
    return () => window.removeEventListener('pageshow', resetAfterGatewayBack);
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

    if (fulfillment === 'delivery' && !deliveryArea) {
      setDeliveryError('Please choose your delivery area before checkout.');
      toast({
        title: 'Choose delivery area',
        description: 'Please select your delivery area before checkout.',
        variant: 'destructive',
      });
      return;
    }

    if (fulfillment === 'dine_in' && !formData.tableNumber.trim()) {
      toast({
        title: 'Table number required',
        description: 'Please enter your table number so staff can bring the order to you.',
        variant: 'destructive',
      });
      return;
    }

    setDeliveryError('');

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-ziina-checkout', {
        body: {
          customerName: formData.name,
          phoneNumber: formData.phone,
          customerEmail: checkoutEmail.trim() || null,
          visitorId: getVisitorId(),
          selectedBranch: FIXED_BRANCH,
          orderItems: cartItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            category: item.category,
          })),
          additionalNotes: formData.notes || "None",
          discountCode: discountCode || null,
          orderType: fulfillment,
          paymentMethod: selectedPaymentMethod,
          tableNumber: fulfillment === 'dine_in' ? formData.tableNumber.trim() : null,
          deliveryArea,
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

      console.log('Checkout response:', data);

      if (data?.cashOrder) {
        trackCheckoutComplete({
          orderId: data.orderId || 'unknown',
          total: total,
          itemCount: itemCount
        });
        try {
          localStorage.removeItem(CHECKOUT_FORM_KEY);
        } catch (storageError) {
          console.warn('Failed to clear checkout form after cash order:', storageError);
        }
        navigate(`/payment-success?cash=1&order_id=${encodeURIComponent(data.orderId)}&order_number=${encodeURIComponent(data.orderNumber || '')}`);
        return;
      }

      if (!data?.url) {
        throw new Error('No redirect URL received from Ziina');
      }

      trackCheckoutComplete({
        orderId: data.paymentId || 'unknown',
        total: total,
        itemCount: itemCount
      });

      // Redirect in the SAME tab to Ziina. This way:
      // - Mobile users go straight to the gateway (no popup blockers, no awaiting screen)
      // - The browser back button naturally returns to /checkout
      // - Form data is restored from localStorage on return
      // - Cart remains intact since we don't clear it until /payment-success
      sessionStorage.setItem(CHECKOUT_PAYMENT_REDIRECT_KEY, '1');
      window.location.href = data.url;

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
                      <span className="text-sm text-coffee-600">
                        {selectedPaymentMethod === 'cash' ? 'Cash dine-in order' : 'Secure payment powered by Ziina'}
                      </span>
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
                      <DeliveryAreaSelector subtotal={subtotal} error={deliveryError} />

                      {fulfillment === 'dine_in' && (
                        <div className="rounded-lg border border-coffee-200 bg-cream-50 p-4">
                          <h2 className="mb-4 text-xl font-semibold text-coffee-800">
                            Dine-in Details
                          </h2>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="tableNumber" className="flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                Table Number
                              </Label>
                              <Input
                                id="tableNumber"
                                name="tableNumber"
                                required={fulfillment === 'dine_in'}
                                value={formData.tableNumber}
                                onChange={handleInputChange}
                                placeholder="e.g. 7"
                                className="mt-1"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Payment Method</Label>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'online' }))}
                                  className={`flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors active:scale-[0.98] ${
                                    formData.paymentMethod === 'online'
                                      ? 'border-coffee-600 bg-coffee-600 text-white'
                                      : 'border-coffee-200 bg-white text-coffee-700 hover:bg-cream-100'
                                  }`}
                                >
                                  <CreditCard className="h-4 w-4" />
                                  Pay online
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cash' }))}
                                  className={`flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors active:scale-[0.98] ${
                                    formData.paymentMethod === 'cash'
                                      ? 'border-coffee-600 bg-coffee-600 text-white'
                                      : 'border-coffee-200 bg-white text-coffee-700 hover:bg-cream-100'
                                  }`}
                                >
                                  <Banknote className="h-4 w-4" />
                                  Pay cash at cafe
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

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
                            <Label htmlFor="email" className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email <span className="font-normal text-coffee-500">(optional)</span>
                            </Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={checkoutEmail}
                              onChange={handleInputChange}
                              placeholder="you@example.com"
                              disabled={Boolean(accountEmail)}
                              className="mt-1"
                            />
                            <p className="mt-1 text-xs leading-5 text-coffee-500">
                              {accountEmail
                                ? 'Using your account email for rewards and order history.'
                                : 'Add your email or sign up for offers, better prices, and free beverages.'}
                            </p>
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

                      {selectedPaymentMethod === 'cash' ? (
                        <div className="rounded-lg bg-cream-100 p-4">
                          <p className="text-sm text-coffee-700">
                            Your order goes straight to the kitchen. Please pay cash at the cafe.
                          </p>
                        </div>
                      ) : (
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
                      )}

                      <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="w-full bg-coffee-600 hover:bg-coffee-700"
                      >
                        {loading
                          ? 'Processing...'
                          : selectedPaymentMethod === 'cash'
                            ? `Place Cash Order - AED ${total.toFixed(2)}`
                            : `Proceed to Payment - AED ${total.toFixed(2)}`}
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
                          <PromoCodeInput />
                          <div className="flex justify-between text-sm text-coffee-700 pt-2">
                            <span>Subtotal</span>
                            <span>AED {subtotal.toFixed(2)}</span>
                          </div>
                          {loyaltyDiscount > 0 && (
                            <div className="flex justify-between text-sm text-green-600 font-medium">
                              <span>Loyalty discount ({loyaltyPercent}%)</span>
                              <span>-AED {loyaltyDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          {codeDiscount > 0 && discountInfo && (
                            <div className="flex justify-between text-sm text-green-700 font-medium">
                              <span>Promo ({discountInfo.code} −{discountInfo.percent}%)</span>
                              <span>−AED {codeDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm text-coffee-700">
                            <span>Order type</span>
                            <span>{getFulfillmentLabel(fulfillment)}</span>
                          </div>
                          {fulfillment === 'dine_in' && (
                            <>
                              <div className="flex justify-between text-sm text-coffee-700">
                                <span>Table</span>
                                <span>{formData.tableNumber.trim() || 'Enter table number'}</span>
                              </div>
                              <div className="flex justify-between text-sm text-coffee-700">
                                <span>Payment</span>
                                <span>{selectedPaymentMethod === 'cash' ? 'Cash at cafe' : 'Online'}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between text-sm text-coffee-700">
                            <span>Delivery</span>
                            <span>{fulfillment === 'dine_in' ? 'No fee' : delivery?.label || 'Choose area'}</span>
                          </div>
                          {fulfillment === 'delivery' && delivery?.isTbc && (
                            <p className="text-xs font-medium text-coffee-600">
                              We'll confirm your delivery fee by phone.
                            </p>
                          )}
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
