// Kitchen Dashboard v6 - Inline auth + parallel data loading for instant load
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  LogOut,
  RefreshCw,
  Volume2,
  VolumeX,
  Package,
  ExternalLink,
  Music,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useKitchenAlert } from "@/hooks/useKitchenAlert";
import { OrderTable } from "@/components/kitchen/OrderTable";
import { KitchenSidebar, type KitchenView } from "@/components/kitchen/KitchenSidebar";
import { SoundPicker } from "@/components/kitchen/SoundPicker";
import type { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;

interface OrderWithItems extends Order {
  items: OrderItem[];
}

type DateRangeOption = '1month' | '2months' | '3months' | '4months';

const dateRangeLabels: Record<DateRangeOption, string> = {
  '1month': '1 Month',
  '2months': '2 Months',
  '3months': '3 Months',
  '4months': '4 Months',
};

const getDateFromRange = (range: DateRangeOption): Date => {
  const now = new Date();
  const days = { '1month': 30, '2months': 60, '3months': 90, '4months': 120 }[range];
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
};

const KitchenDashboard = () => {
  const mountedRef = useRef(true);

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [unacknowledgedOrders, setUnacknowledgedOrders] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<KitchenView>("paid");
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeOption>(() =>
    (localStorage.getItem('kitchen_date_range') as DateRangeOption) || '1month'
  );
  const [selectedSound, setSelectedSound] = useState(() =>
    localStorage.getItem('kitchen_alert_sound') || 'chime'
  );
  const [customAudioUrl, setCustomAudioUrl] = useState(() =>
    localStorage.getItem('kitchen_alert_custom_url') || ''
  );
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAlertTimeout = useCallback(() => {
    toast({
      title: "Alert Timed Out",
      description: "Sound stopped after 2.5 minutes. New orders still need acknowledgment.",
      variant: "destructive",
    });
  }, [toast]);

  const { isPlaying, startAlert, stopAlert, initAudioContext } = useKitchenAlert({
    soundId: selectedSound,
    customAudioUrl: selectedSound === 'custom' ? customAudioUrl : undefined,
    maxDuration: 150000,
    onTimeout: handleAlertTimeout,
  });

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initAudioContext();
      window.removeEventListener('click', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    return () => window.removeEventListener('click', handleFirstInteraction);
  }, [initAudioContext]);

  // Initial settings load
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await supabase
          .from('kitchen_settings')
          .select('setting_value')
          .eq('setting_key', 'custom_audio_url')
          .maybeSingle();

        if (data?.setting_value) {
          setCustomAudioUrl(data.setting_value);
          setSelectedSound('custom');
          localStorage.setItem('kitchen_alert_sound', 'custom');
          localStorage.setItem('kitchen_alert_custom_url', data.setting_value);
        }
      } catch (err) {
        console.error('Failed to load kitchen settings', err);
      }
    };
    loadSettings();
  }, []);

  // Reload orders when date range changes (after initial load)
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      // KitchenAuthGate already guarantees a valid session.
      // The Supabase client auto-refreshes the token; no manual refresh here.
      const startDate = getDateFromRange(dateRange);
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map(o => o.id);
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        setOrders(ordersData.map(order => ({
          ...order,
          items: (itemsData || []).filter(item => item.order_id === order.id),
        })));
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load orders" });
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, toast]);

  // Re-fetch when date range changes or component mounts
  useEffect(() => {
    mountedRef.current = true;
    loadOrders();
    return () => {
      mountedRef.current = false;
    };
  }, [dateRange, loadOrders]);

  // Bulletproof the iPad sleep-wake cycle & Fallback Polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadOrders();
      }
    };

    const handleOnline = () => {
      loadOrders();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    const fallbackInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadOrders();
      }
    }, 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      clearInterval(fallbackInterval);
    };
  }, [loadOrders]);

  // Realtime subscription — wait for auth session to be ready
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    // Flag to prevent toast spam on mass updates
    let lastToastTime = 0;

    const setupRealtime = async () => {
      // Ensure the auth token is fully available before subscribing
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session) return;

      channel = supabase
        .channel('kitchen-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          const newOrderData = payload.new as Order;
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', newOrderData.id);

          const newOrder: OrderWithItems = { ...newOrderData, items: itemsData || [] };
          setOrders(prev => {
            if (prev.some(o => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });

          const now = Date.now();
          if (now - lastToastTime > 1000) {
            lastToastTime = now;
            if (newOrder.payment_status === 'pending') {
              toast({
                title: "📋 New Pending Order",
                description: `Order ${newOrder.order_number} from ${newOrder.customer_name}`,
                className: "bg-yellow-50 border-yellow-300",
              });
            } else if (newOrder.payment_status === 'paid') {
              setUnacknowledgedOrders(prev => new Set([...Array.from(prev), newOrder.id]));
              toast({
                title: "💰 New Paid Order!",
                description: `Order ${newOrder.order_number} from ${newOrder.customer_name}`,
                className: "bg-green-50 border-green-300",
              });
            }
          }
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' },
        (payload) => {
          const newItem = payload.new as OrderItem;
          setOrders(prev => prev.map(order =>
            order.id === newItem.order_id
              ? { ...order, items: order.items.find(i => i.id === newItem.id) ? order.items : [...order.items, newItem] }
              : order
          ));
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
        async (payload) => {
          const updatedOrder = payload.new as Order;
          const oldOrder = payload.old as Partial<Order>;

          // Only trigger Paid alerts if it transitioned from pending -> paid
          if (updatedOrder.payment_status === 'paid' && oldOrder.payment_status !== 'paid') {
            setUnacknowledgedOrders(prev => new Set([...Array.from(prev), updatedOrder.id]));

            // Only force active view change if they aren't actively looking at something else
            setActiveView(prev => prev === 'pending' ? 'paid' : prev);

            const { data: itemsData } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', updatedOrder.id);

            setOrders(prev => prev.map(order =>
              order.id === updatedOrder.id
                ? { ...order, ...updatedOrder, items: itemsData || order.items }
                : order
            ));

            const now = Date.now();
            if (now - lastToastTime > 1000) {
              lastToastTime = now;
              toast({
                title: "💰 New Paid Order!",
                description: `Order ${updatedOrder.order_number} from ${updatedOrder.customer_name} is ready to prepare!`,
                className: "bg-green-50 border-green-300",
              });
            }
          } else {
            setOrders(prev => prev.map(order =>
              order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
            ));
          }
        }
      )
      .subscribe();
    };

    setupRealtime();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      stopAlert();
    };
  }, [stopAlert, toast]);

  // Alert sound based on unacknowledged orders
  useEffect(() => {
    if (soundEnabled && unacknowledgedOrders.size > 0) {
      startAlert();
    } else {
      stopAlert();
    }
  }, [unacknowledgedOrders.size, soundEnabled, startAlert, stopAlert]);

  const handleAcknowledge = useCallback((orderId: string) => {
    setUnacknowledgedOrders(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      return newSet;
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/staff/login');
  };

  const handleSoundSelect = async (soundId: string, customUrl?: string) => {
    setSelectedSound(soundId);
    localStorage.setItem('kitchen_alert_sound', soundId);
    if (customUrl) {
      setCustomAudioUrl(customUrl);
      localStorage.setItem('kitchen_alert_custom_url', customUrl);
      await supabase
        .from('kitchen_settings')
        .upsert({ setting_key: 'custom_audio_url', setting_value: customUrl, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' });
    }
    toast({
      title: "Sound Updated",
      description: soundId === 'custom' ? "Custom audio URL saved and synced." : "Alert sound preference saved.",
    });
  };

  const handleDateRangeChange = (range: DateRangeOption) => {
    setDateRange(range);
    localStorage.setItem('kitchen_date_range', range);
  };



  const paidOrders = orders.filter(o => o.payment_status === 'paid');
  const pendingOrders = orders.filter(o => o.payment_status === 'pending');
  const currentOrders = activeView === 'paid' ? paidOrders : pendingOrders;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <KitchenSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          paidCount={paidOrders.length}
          pendingCount={pendingOrders.length}
          unacknowledgedCount={unacknowledgedOrders.size}
        />

        <div className="flex-1 flex flex-col">
          <header className="bg-card shadow-sm border-b sticky top-0 z-50">
            <div className="px-2 sm:px-4 py-2 sm:py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <SidebarTrigger />
                  <div className="min-w-0">
                    <h1 className="text-sm sm:text-lg font-bold text-foreground truncate">
                      {activeView === 'paid' ? '✅ Paid Orders' : '⏳ Pending Orders'}
                    </h1>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Last {dateRangeLabels[dateRange].toLowerCase()} • {currentOrders.length} orders
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0 flex-wrap justify-end">
                  {/* Date Range - Desktop */}
                  <div className="hidden md:flex gap-1 bg-muted rounded-lg p-1">
                    {(['1month', '2months', '3months', '4months'] as DateRangeOption[]).map((range) => (
                      <Button
                        key={range}
                        variant={dateRange === range ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleDateRangeChange(range)}
                        className="text-xs px-2"
                      >
                        {dateRangeLabels[range]}
                      </Button>
                    ))}
                  </div>

                  {/* Date Range - Mobile */}
                  <div className="md:hidden">
                    <select
                      value={dateRange}
                      onChange={(e) => handleDateRangeChange(e.target.value as DateRangeOption)}
                      className="text-xs bg-muted border-none rounded-lg px-2 py-1.5 text-foreground"
                    >
                      {(['1month', '2months', '3months', '4months'] as DateRangeOption[]).map((range) => (
                        <option key={range} value={range}>{dateRangeLabels[range]}</option>
                      ))}
                    </select>
                  </div>

                  {unacknowledgedOrders.size > 0 && (
                    <div className="px-3 py-1.5 bg-destructive/10 rounded-full animate-pulse">
                      <span className="text-sm font-bold text-destructive">{unacknowledgedOrders.size} New!</span>
                    </div>
                  )}

                  <Button variant="outline" size="sm" onClick={() => setShowSoundPicker(true)} className="hidden sm:flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    <span className="text-xs">Sound</span>
                  </Button>

                  {isPlaying && unacknowledgedOrders.size > 0 && (
                    <div className="flex flex-col gap-1">
                      {Array.from(unacknowledgedOrders).map((orderId) => {
                        const order = orders.find(o => o.id === orderId);
                        const orderNum = order?.order_number?.split('-').pop() || String(orderId).slice(0, 6);
                        return (
                          <Button
                            key={orderId}
                            variant="destructive"
                            size="default"
                            onClick={() => {
                              handleAcknowledge(orderId);
                              toast({ title: "Order Acknowledged", description: `Order #${orderNum} acknowledged - ${unacknowledgedOrders.size - 1} remaining` });
                            }}
                            className="flex items-center gap-2 animate-pulse shadow-lg"
                          >
                            <VolumeX className="w-5 h-5" />
                            <span className="font-semibold">Stop #{orderNum}</span>
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  {!isPlaying && (
                    <Button variant="outline" size="sm" onClick={() => { startAlert(); toast({ title: "Testing Continuous Alert", description: "Alert will loop for 2.5 minutes or until you click Stop.", duration: 5000 }); }} className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      <span className="text-xs hidden sm:inline">Test Alert</span>
                    </Button>
                  )}

                  <div className="flex items-center gap-2">
                    <Label htmlFor="sound" className="sr-only">Sound</Label>
                    {soundEnabled ? (
                      <Volume2 className={`w-4 h-4 ${isPlaying ? 'text-destructive animate-pulse' : 'text-foreground'}`} />
                    ) : (
                      <VolumeX className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Switch id="sound" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                  </div>

                  <Button variant="outline" size="icon" onClick={loadOrders} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-2 sm:p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : currentOrders.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                    No {activeView === 'paid' ? 'Paid' : 'Pending'} Orders
                  </h2>
                  <p className="text-muted-foreground/70">Orders will appear here in real-time</p>
                </CardContent>
              </Card>
            ) : (
              <OrderTable
                orders={currentOrders}
                type={activeView}
                unacknowledged={unacknowledgedOrders}
                onAcknowledge={handleAcknowledge}
              />
            )}
          </main>
        </div>
      </div>

      {showSoundPicker && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowSoundPicker(false)} />
          <SoundPicker
            currentSound={selectedSound}
            currentCustomUrl={customAudioUrl}
            onSelect={handleSoundSelect}
            onClose={() => setShowSoundPicker(false)}
          />
        </>
      )}
    </SidebarProvider>
  );
};

export default KitchenDashboard;
