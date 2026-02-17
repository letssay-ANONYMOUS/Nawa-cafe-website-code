import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const paymentId = searchParams.get('payment_id');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId) {
        setError('Missing order information. Please contact support.');
        setVerifying(false);
        return;
      }

      try {
        // Call the verification edge function directly — it uses service role
        // to look up the order and verify payment server-side
        const { data, error: verifyError } = await supabase.functions.invoke('verify-ziina-payment', {
          body: { 
            payment_id: paymentId || '', 
            order_id: orderId 
          }
        });

        console.log('Verification response:', data, verifyError);

        if (verifyError) {
          console.error('Verification error:', verifyError);
          setError('Payment verification failed. Please contact support.');
          setVerifying(false);
          return;
        }

        if (data?.success) {
          setVerified(true);
          setOrderNumber(data.order_number);
          toast({
            title: "Payment Confirmed!",
            description: "Thank you for your order. We'll start preparing it right away!",
          });
        } else {
          console.log('Payment not verified:', data);
          setError(data?.error || 'Payment verification failed. Please try again or contact support.');
        }
      } catch (err) {
        console.error('Verification exception:', err);
        setError('An error occurred while verifying your payment. Please contact support.');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [orderId, paymentId, toast]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-coffee-600 mx-auto mb-4" />
          <p className="text-lg text-coffee-700">Verifying your payment...</p>
          <p className="text-sm text-coffee-500 mt-2">Please wait while we confirm your order</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <section className="flex-1 flex items-center justify-center py-20 bg-cream-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              
              <h1 className="font-playfair text-2xl font-bold text-coffee-800 mb-4">
                Verification Issue
              </h1>
              
              <p className="text-coffee-600 mb-8">
                {error}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate('/checkout')}
                  variant="outline"
                  className="border-coffee-300 text-coffee-700"
                >
                  Back to Checkout
                </Button>
                <Button
                  onClick={() => navigate('/contact')}
                  className="bg-coffee-600 hover:bg-coffee-700"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <section className="flex-1 flex items-center justify-center py-20 bg-cream-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            {/* Starburst Badge with Checkmark */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path
                  d="M50 0 L54 20 L60 2 L61 22 L70 5 L68 25 L80 10 L75 29 L88 17 L80 34 L95 25 L85 40 L100 35 L90 47 L100 50 L90 53 L100 65 L85 60 L95 75 L80 66 L88 83 L75 71 L80 90 L68 75 L70 95 L61 78 L60 98 L54 80 L50 100 L46 80 L40 98 L39 78 L30 95 L32 75 L20 90 L25 71 L12 83 L20 66 L5 75 L15 60 L0 65 L10 53 L0 50 L10 47 L0 35 L15 40 L5 25 L20 34 L12 17 L25 29 L20 10 L32 25 L30 5 L39 22 L40 2 L46 20 Z"
                  fill="#22c55e"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={3} />
              </div>
            </div>
            
            <h1 className="font-playfair text-3xl font-bold text-coffee-800 mb-4">
              Thank You!
            </h1>
            
            <p className="text-lg text-coffee-600 mb-2">
              Your order has been placed successfully.
            </p>
            
            {orderNumber && (
              <p className="text-coffee-500 mb-8">
                Order Reference: <span className="font-semibold">{orderNumber}</span>
              </p>
            )}

            <Button
              onClick={() => navigate('/')}
              className="bg-coffee-600 hover:bg-coffee-700 px-8 py-3"
            >
              Go Home
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;
