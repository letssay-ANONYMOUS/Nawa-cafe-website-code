import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight } from 'lucide-react';

interface ConversionFunnelProps {
  dateRange: 'today' | '7days' | '30days';
}

interface FunnelData {
  pageViews: number;
  menuViews: number;
  addToCart: number;
  checkoutStarted: number;
  orderComplete: number;
}

export const ConversionFunnel = ({ dateRange }: ConversionFunnelProps) => {
  const [data, setData] = useState<FunnelData>({
    pageViews: 0,
    menuViews: 0,
    addToCart: 0,
    checkoutStarted: 0,
    orderComplete: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let startDate: Date;
      switch (dateRange) {
        case '7days':
          startDate = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = startOfToday;
      }

      // Fetch page views
      const { count: pageViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .gte('viewed_at', startDate.toISOString());

      // Fetch menu views
      const { count: menuViews } = await supabase
        .from('menu_item_views')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'view')
        .gte('viewed_at', startDate.toISOString());

      // Fetch add to cart
      const { count: addToCart } = await supabase
        .from('menu_item_views')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'add_to_cart')
        .gte('viewed_at', startDate.toISOString());

      // Fetch checkout started events
      const { count: checkoutStarted } = await supabase
        .from('site_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'checkout_started')
        .gte('created_at', startDate.toISOString());

      // Fetch completed orders via admin edge function
      const token = localStorage.getItem('admin_session') || '';
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const ordersResponse = await fetch(
        `${supabaseUrl}/functions/v1/admin-orders?mode=count&start_date=${startDate.toISOString()}&payment_status=paid`,
        {
          headers: {
            'x-admin-token': token,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      const ordersResult = await ordersResponse.json();
      const orderComplete = ordersResult.count || 0;

      setData({
        pageViews: pageViews || 0,
        menuViews: menuViews || 0,
        addToCart: addToCart || 0,
        checkoutStarted: checkoutStarted || 0,
        orderComplete: orderComplete || 0
      });
      setIsLoading(false);
    };

    fetchData();
  }, [dateRange]);

  const steps = [
    { label: 'Views', value: data.pageViews },
    { label: 'Menu', value: data.menuViews },
    { label: 'Cart', value: data.addToCart },
    { label: 'Checkout', value: data.checkoutStarted },
    { label: 'Orders', value: data.orderComplete }
  ];

  const maxValue = Math.max(...steps.map(s => s.value), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => {
              const width = Math.max((step.value / maxValue) * 100, 10);
              const prevValue = index > 0 ? steps[index - 1].value : step.value;
              const conversionRate = prevValue > 0 ? Math.round((step.value / prevValue) * 100) : 0;
              
              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{step.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{step.value}</span>
                      {index > 0 && (
                        <span className={`text-xs ${conversionRate >= 50 ? 'text-green-500' : 'text-amber-500'}`}>
                          ({conversionRate}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded overflow-hidden">
                    <div 
                      className="h-full bg-primary/80 rounded transition-all duration-300"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
