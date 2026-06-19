import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Gift, Minus, Plus, Trash2, ShoppingCart, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { useDiscountCode, computeCodeDiscount, round2 } from '@/hooks/useDiscountCode';
import { useGlobalDiscount } from '@/hooks/useGlobalDiscount';
import ShareCartPayment from '@/components/ShareCartPayment';
import DeliveryAreaSelector from '@/components/DeliveryAreaSelector';
import { calculateDeliveryFee, getFulfillmentLabel, useDeliveryArea, useOrderFulfillment } from '@/lib/delivery';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useLoyaltyReward } from '@/hooks/useLoyaltyReward';

const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal } = useCart();
  const { info: discountInfo } = useDiscountCode();
  const { data: globalDiscountInfo } = useGlobalDiscount();
  const { area } = useDeliveryArea();
  const { fulfillment } = useOrderFulfillment();
  const { toast } = useToast();
  const { user } = useCustomerAuth();
  const navigate = useNavigate();
  const [rewardsPromptOpen, setRewardsPromptOpen] = useState(false);
  const { amount: loyaltyReward } = useLoyaltyReward(cartItems, user?.id);

  const subtotal = getCartTotal();
  const globalDiscount = computeCodeDiscount(cartItems, subtotal, globalDiscountInfo ?? null);
  const codeDiscount = computeCodeDiscount(cartItems, subtotal, discountInfo);
  const delivery = calculateDeliveryFee(area, subtotal, fulfillment);
  const deliveryFee = delivery?.fee ?? 0;
  const total = round2(Math.max(0, subtotal - globalDiscount - codeDiscount - loyaltyReward) + deliveryFee);

  const proceedToCheckout = () => {
    if (fulfillment === 'delivery' && !area) {
      toast({
        title: 'Choose delivery area',
        description: 'Please select your delivery area before checkout.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      setRewardsPromptOpen(true);
      return;
    }

    navigate('/checkout');
  };

  const continueToCheckout = () => {
    setRewardsPromptOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-12 bg-gradient-to-br from-coffee-800 to-coffee-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-playfair text-4xl md:text-6xl font-bold text-white mb-4">
            Your Cart
          </h1>
          <p className="text-lg md:text-xl text-cream-100 max-w-2xl mx-auto">
            Review your items and proceed to checkout
          </p>
        </div>
      </section>

      {/* Cart Content */}
      <section className="py-12 md:py-20 bg-cream-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {cartItems.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <ShoppingCart className="w-16 h-16 text-coffee-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold text-coffee-800 mb-2">Your cart is empty</h2>
                  <p className="text-coffee-600 mb-6">Add some delicious items to get started!</p>
                  <Link to="/menu">
                    <Button size="lg" className="bg-coffee-600 hover:bg-coffee-700">
                      Browse Menu
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                  {cartItems.map(item => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full sm:w-24 h-24 object-cover rounded-lg"
                          />
                           <div className="flex-1">
                            <h3 className="font-semibold text-lg text-coffee-800 mb-2">{item.name}</h3>
                            <p className="text-coffee-600 font-medium mb-4">AED {item.price.toFixed(2)}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="h-8 w-8"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="font-medium text-coffee-800 w-8 text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="h-8 w-8"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <Card className="sticky top-8">
                    <CardContent className="p-6">
                      <h2 className="text-2xl font-semibold text-coffee-800 mb-6">Order Summary</h2>
                      <div className="space-y-4 mb-6">
                        <DeliveryAreaSelector subtotal={subtotal} />
                        <PromoCodeInput />
                        <div className="border-t border-coffee-200 pt-4 space-y-2">
                          <div className="flex justify-between text-sm text-coffee-700">
                            <span>Subtotal</span>
                            <span>AED {subtotal.toFixed(2)}</span>
                          </div>
                          {globalDiscount > 0 && globalDiscountInfo && (
                            <div className="flex justify-between text-sm text-green-600 font-medium">
                              <span>Global discount ({globalDiscountInfo.percent}%)</span>
                              <span>-AED {globalDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          {codeDiscount > 0 && discountInfo && (
                            <div className="flex justify-between text-sm text-green-700 font-medium">
                              <span>Promo ({discountInfo.code} −{discountInfo.percent}%)</span>
                              <span>−AED {codeDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          {loyaltyReward > 0 && (
                            <div className="flex justify-between text-sm text-green-700 font-medium">
                              <span>Free loyalty reward</span>
                              <span>-AED {loyaltyReward.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm text-coffee-700">
                            <span>Order type</span>
                            <span>{getFulfillmentLabel(fulfillment)}</span>
                          </div>
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
                      <Button
                        size="lg"
                        className="w-full bg-coffee-600 hover:bg-coffee-700"
                        onClick={proceedToCheckout}
                      >
                        Proceed to Checkout
                      </Button>
                      <ShareCartPayment subtotal={subtotal} total={total} />
                      <Link to="/menu">
                        <Button variant="outline" size="lg" className="w-full mt-3">
                          Continue Shopping
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Dialog open={rewardsPromptOpen} onOpenChange={setRewardsPromptOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg p-5 sm:p-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coffee-100 text-coffee-700">
              <Gift className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl text-coffee-800">Unlock free drinks</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-coffee-600">
                Sign up for offers, better prices, and every 11th beverage free.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-3 flex flex-col gap-2 sm:flex-col">
            <Button
              className="h-12 w-full bg-coffee-600 hover:bg-coffee-700"
              onClick={() => navigate('/signup')}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Sign up for rewards
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full"
              onClick={() => navigate('/login')}
            >
              I already have an account
            </Button>
            <Button
              variant="ghost"
              className="h-11 w-full text-coffee-700"
              onClick={continueToCheckout}
            >
              Continue as guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default CartPage;
