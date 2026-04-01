import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const PaymentPendingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order_id');
  const [paymentUrl] = useState(() => sessionStorage.getItem('ziina_payment_url'));

  // Auto-open payment page on mount
  useEffect(() => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Poll for payment status
  useEffect(() => {
    if (!orderId) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .single();

      if (data?.payment_status === 'paid') {
        clearInterval(interval);
        navigate(`/payment-success?order_id=${orderId}`, { replace: true });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [orderId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50">
      <div className="text-center max-w-md mx-auto px-4">
        <Loader2 className="w-14 h-14 animate-spin text-coffee-600 mx-auto mb-6" />

        <h1 className="font-playfair text-2xl font-bold text-coffee-800 mb-3">
          Awaiting Payment
        </h1>

        <p className="text-coffee-600 mb-6">
          Complete your payment on the Ziina page. This screen will update automatically once your payment is confirmed.
        </p>

        {paymentUrl && (
          <p className="text-sm text-coffee-500 mb-4">
            Payment page didn't open?{' '}
            <button
              onClick={() => window.open(paymentUrl, '_blank', 'noopener,noreferrer')}
              className="underline text-coffee-700 font-medium"
            >
              Click here to open it
            </button>
          </p>
        )}

        <div className="mt-6">
          <Button
            variant="outline"
            onClick={() => navigate('/checkout')}
            className="border-coffee-300 text-coffee-700"
          >
            Cancel & Return to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPendingPage;
