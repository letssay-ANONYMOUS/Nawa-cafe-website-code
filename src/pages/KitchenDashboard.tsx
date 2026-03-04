// Kitchen Dashboard v5 - With continuous alert system + custom audio support
import { useState, useEffect, useCallback } from "react";
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
  Calendar
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

// Date range options for order history
type DateRangeOption = '1month' | '2months' | '3months' | '4months';

const dateRangeLabels: Record<DateRangeOption, string> = {
  '1month': '1 Month',
  '2months': '2 Months',
  '3months': '3 Months',
  '4months': '4 Months',
};

const getDateFromRange = (range: DateRangeOption): Date => {
  const now = new Date();
  switch (range) {
    case '1month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '2months':
      return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    case '3months':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '4months':
      return new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
  }
};

const KitchenDashboard = () => {
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

  // Handle timeout callback
  const handleAlertTimeout = useCallback(() => {
    toast({
      title: "Alert Timed Out",
      description: "Sound stopped after 2.5 minutes. New orders still need acknowledgment.",
      variant: "destructive",
    });
  }, [toast]);

  // Use the enhanced alert hook with options object
  const { isPlaying, startAlert, stopAlert, initAudioContext } = useKitchenAlert({
    soundId: selectedSound,
    customAudioUrl: selectedSound === 'custom' ? customAudioUrl : undefined,
    maxDuration: 150000, // 2.5 minutes
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

  // Load shared custom audio URL from database on mount
  useEffect(() => {
    const loadSharedSettings = async () => {
      const { data } = await supabase
        .from('kitchen_settings')
        .select('setting_value')
        .eq('setting_key', 'custom_audio_url')
        .single();
      
      if (data?.setting_value) {
        setCustomAudioUrl(data.setting_value);
        setSelectedSound('custom');
        localStorage.setItem('kitchen_alert_sound', 'custom');
        localStorage.setItem('kitchen_alert_custom_url', data.setting_value);
      }
    };
    loadSharedSettings();
  }, []);

  // Save sound preference (to both localStorage and database for cross-device sync)
  const handleSoundSelect = async (soundId: string, customUrl?: string) => {
    setSelectedSound(soundId);
    localStorage.setItem('kitchen_alert_sound', soundId);
    
    if (customUrl) {
      setCustomAudioUrl(customUrl);
      localStorage.setItem('kitchen_alert_custom_url', customUrl);
      
      // Save to database for cross-device sync
      await supabase
        .from('kitchen_settings')
        .upsert({ 
          setting_key: 'custom_audio_url', 
          setting_value: customUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
    }
    
    toast({
      title: "Sound Updated",
      description: soundId === 'custom' 
        ? "Custom audio URL saved and synced to all devices."
        : "Your alert sound preference has been saved.",
  });
  };

  // Handle date range change
  const handleDateRangeChange = (range: DateRangeOption) => {
    setDateRange(range);
    localStorage.setItem('kitchen_date_range', range);
  };

  useEffect(() => {
    loadOrders();

    // Set up realtime subscription instead of polling
    const channel = setupRealtimeSubscription();

    return () => {
      supabase.removeChannel(channel);
      stopAlert();
    };
  }, [dateRange]);

  // Manage alert sound based on unacknowledged orders
  useEffect(() => {
    if (soundEnabled && unacknowledgedOrders.size > 0) {
      startAlert();
    } else {
      stopAlert();
    }
  }, [unacknowledgedOrders.size, soundEnabled, startAlert, stopAlert]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const startDate = getDateFromRange(dateRange);

      // Query orders directly via Supabase client (RLS restricts to staff/admin)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map(o => o.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        const ordersWithItems: OrderWithItems[] = ordersData.map((order) => ({
          ...order,
          items: (itemsData || []).filter((item) => item.order_id === order.id)
        }));
        setOrders(ordersWithItems);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load orders"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('New order received:', payload);
          
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', payload.new.id);

          const newOrder: OrderWithItems = {
            ...payload.new as Order,
            items: itemsData || []
          };

          setOrders(prev => [newOrder, ...prev]);
          
          // FOR TESTING: Trigger alert on PENDING orders (normally would be silent)
          if (newOrder.payment_status === 'pending') {
            // Add to unacknowledged set - this triggers the alert sound
            setUnacknowledgedOrders(prev => new Set([...prev, newOrder.id]));
            setActiveView("pending");
            toast({
              title: "📋 New Pending Order!",
              description: `Order ${newOrder.order_number} from ${newOrder.customer_name}`,
              className: "bg-yellow-50 border-yellow-300"
            });
          } else if (newOrder.payment_status === 'paid') {
            // Direct paid order (rare, but handle it)
            setUnacknowledgedOrders(prev => new Set([...prev, newOrder.id]));
            setActiveView("paid");
            toast({
              title: "💰 New Paid Order!",
              description: `Order ${newOrder.order_number} from ${newOrder.customer_name}`,
              className: "bg-green-50 border-green-300"
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('Order updated:', payload);
          const updatedOrder = payload.new as Order;
          const oldOrder = payload.old as Partial<Order>;
          
          // DISABLED FOR TESTING - Sound now triggers on PENDING orders instead
          // To revert: Uncomment this block and remove setUnacknowledgedOrders from INSERT pending handler
          // if (updatedOrder.payment_status === 'paid' && oldOrder.payment_status !== 'paid') {
          //   setUnacknowledgedOrders(prev => new Set([...prev, updatedOrder.id]));
          //   setActiveView("paid");
          //   toast({
          //     title: "💰 New Paid Order!",
          //     description: `Order ${updatedOrder.order_number} from ${updatedOrder.customer_name} is ready to prepare!`,
          //     className: "bg-green-50 border-green-300"
          //   });
          // }
          
          // Update order in state
          setOrders(prev => prev.map(order => 
            order.id === updatedOrder.id 
              ? { ...order, ...updatedOrder }
              : order
          ));
        }
      )
      .subscribe();

    return channel;
  };

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

  const paidOrders = orders.filter(o => o.payment_status === 'paid');
  const pendingOrders = orders.filter(o => o.payment_status === 'pending');
  const currentOrders = activeView === 'paid' ? paidOrders : pendingOrders;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <KitchenSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          paidCount={paidOrders.length}
          pendingCount={pendingOrders.length}
          unacknowledgedCount={unacknowledgedOrders.size}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
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
                  {/* Date Range Selector */}
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

                  {/* Mobile Date Range Dropdown */}
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

                  {/* Stats Badge */}
                  {unacknowledgedOrders.size > 0 && (
                    <div className="px-3 py-1.5 bg-destructive/10 rounded-full animate-pulse">
                      <span className="text-sm font-bold text-destructive">{unacknowledgedOrders.size} New!</span>
                    </div>
                  )}

                  {/* Sound Picker Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSoundPicker(true)}
                    className="hidden sm:flex items-center gap-2"
                  >
                    <Music className="w-4 h-4" />
                    <span className="text-xs">Sound</span>
                  </Button>

                  {/* STACKED STOP BUTTONS - One for each unacknowledged order */}
                  {isPlaying && unacknowledgedOrders.size > 0 && (
                    <div className="flex flex-col gap-1">
                      {Array.from(unacknowledgedOrders).map((orderId) => {
                        const order = orders.find(o => o.id === orderId);
                        const orderNum = order?.order_number?.split('-').pop() || orderId.slice(0, 6);
                        return (
                          <Button
                            key={orderId}
                            variant="destructive"
                            size="default"
                            onClick={() => {
                              handleAcknowledge(orderId);
                              toast({ 
                                title: "Order Acknowledged",
                                description: `Order #${orderNum} acknowledged - ${unacknowledgedOrders.size - 1} remaining`
                              });
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

                  {/* Test Alert Button - Only show when not playing */}
                  {!isPlaying && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        startAlert();
                        toast({ 
                          title: "Testing Continuous Alert",
                          description: "Alert will loop for 2.5 minutes or until you click Stop.",
                          duration: 5000,
                        });
                      }}
                      className="flex items-center gap-2"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="text-xs hidden sm:inline">Test Alert</span>
                    </Button>
                  )}

                  {/* Sound Toggle */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sound" className="sr-only">Sound</Label>
                    {soundEnabled ? (
                      <Volume2 className={`w-4 h-4 ${isPlaying ? 'text-destructive animate-pulse' : 'text-foreground'}`} />
                    ) : (
                      <VolumeX className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Switch
                      id="sound"
                      checked={soundEnabled}
                      onCheckedChange={setSoundEnabled}
                    />
                  </div>

                  {/* Refresh */}
                  <Button variant="outline" size="icon" onClick={loadOrders} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>

                  {/* Fullscreen */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (document.fullscreenElement) {
                        document.exitFullscreen();
                      } else {
                        document.documentElement.requestFullscreen();
                      }
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>

                  {/* Logout */}
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
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

      {/* Sound Picker Modal */}
      {showSoundPicker && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowSoundPicker(false)}
          />
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
