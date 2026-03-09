import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, Eye, ShoppingCart, TrendingUp, Coffee, LogOut, Calendar } from 'lucide-react';
import { OverviewCards } from '@/components/analytics/OverviewCards';
import { LiveVisitorsTable } from '@/components/analytics/LiveVisitorsTable';
import { VisitorsChart } from '@/components/analytics/VisitorsChart';
import { DeviceBreakdown } from '@/components/analytics/DeviceBreakdown';
import { TopPagesChart } from '@/components/analytics/TopPagesChart';
import { ConversionFunnel } from '@/components/analytics/ConversionFunnel';
import { MenuItemStats } from '@/components/analytics/MenuItemStats';
import { SessionsTable } from '@/components/analytics/SessionsTable';
import { VisitorDetailsTable } from '@/components/analytics/VisitorDetailsTable';

interface AnalyticsData {
  activeVisitors: number;
  todaySessions: number;
  todayPageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
}

interface VisitorSession {
  id: string;
  visitor_id: string;
  device_type: string | null;
  browser: string | null;
  landing_page: string | null;
  pages_viewed: number | null;
  session_start: string;
  session_end: string | null;
  referrer: string | null;
}

interface AnonymousVisitor {
  id: string;
  visitor_id: string;
  device_type: string | null;
  browser: string | null;
  country: string | null;
  last_seen_at: string;
}

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    activeVisitors: 0,
    todaySessions: 0,
    todayPageViews: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    conversionRate: 0
  });
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [visitors, setVisitors] = useState<AnonymousVisitor[]>([]);
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days'>('today');

  // Proper auth check using Supabase Auth + role verification
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          if (mounted) navigate('/staff/login', { replace: true });
          return;
        }

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .in('role', ['staff', 'admin'])
          .limit(1);

        if (!roles || roles.length === 0) {
          await supabase.auth.signOut();
          if (mounted) navigate('/staff/login', { replace: true });
          return;
        }

        if (mounted) {
          setIsAuthenticated(true);
          setIsLoading(false);
        }
      } catch {
        if (mounted) navigate('/staff/login', { replace: true });
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && mounted) {
        setIsAuthenticated(false);
        navigate('/staff/login', { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
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

    try {
      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('visitor_sessions')
        .select('*')
        .gte('session_start', startDate.toISOString())
        .order('session_start', { ascending: false });

      // Fetch page views
      const { data: pageViewsData } = await supabase
        .from('page_views')
        .select('*')
        .gte('viewed_at', startDate.toISOString());

      // Fetch anonymous visitors (active in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const { data: activeVisitorsData } = await supabase
        .from('anonymous_visitors')
        .select('*')
        .gte('last_seen_at', fiveMinutesAgo.toISOString())
        .order('last_seen_at', { ascending: false });

      // Fetch orders for conversion via admin edge function
      const token = sessionStorage.getItem('admin_session') || '';
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
      const ordersData = ordersResult.count ? Array(ordersResult.count).fill({ id: '' }) : [];

      // Calculate metrics
      const totalSessions = sessionsData?.length || 0;
      const totalPageViews = pageViewsData?.length || 0;
      const activeVisitors = activeVisitorsData?.length || 0;
      const completedOrders = ordersData?.length || 0;

      // Bounce rate: sessions with only 1 page view
      const bouncedSessions = sessionsData?.filter(s => (s.pages_viewed || 0) <= 1).length || 0;
      const bounceRate = totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0;

      // Conversion rate
      const conversionRate = totalSessions > 0 ? (completedOrders / totalSessions) * 100 : 0;

      // Average session duration
      const sessionsWithDuration = sessionsData?.filter(s => s.session_end) || [];
      const totalDuration = sessionsWithDuration.reduce((acc, s) => {
        const start = new Date(s.session_start).getTime();
        const end = new Date(s.session_end!).getTime();
        return acc + (end - start);
      }, 0);
      const avgDuration = sessionsWithDuration.length > 0 
        ? Math.floor(totalDuration / sessionsWithDuration.length / 1000) 
        : 0;

      setAnalytics({
        activeVisitors,
        todaySessions: totalSessions,
        todayPageViews: totalPageViews,
        avgSessionDuration: avgDuration,
        bounceRate: Math.round(bounceRate * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10
      });

      setSessions(sessionsData || []);
      setVisitors(activeVisitorsData || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  }, [dateRange]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    }
  }, [isAuthenticated, fetchAnalytics]);

  // Real-time subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;

    const sessionsChannel = supabase
      .channel('analytics-sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitor_sessions' },
        () => fetchAnalytics()
      )
      .subscribe();

    const visitorsChannel = supabase
      .channel('analytics-visitors')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'anonymous_visitors' },
        () => fetchAnalytics()
      )
      .subscribe();

    const pageViewsChannel = supabase
      .channel('analytics-pageviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'page_views' },
        () => fetchAnalytics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(visitorsChannel);
      supabase.removeChannel(pageViewsChannel);
    };
  }, [isAuthenticated, fetchAnalytics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAnalytics();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/staff/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Coffee className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Café Analytics</h1>
              <p className="text-sm text-muted-foreground">See how customers use your website</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Date Range Selector */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {(['today', '7days', '30days'] as const).map((range) => (
                <Button
                  key={range}
                  variant={dateRange === range ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDateRange(range)}
                  className="text-xs"
                >
                  {range === 'today' ? 'Today' : range === '7days' ? 'Week' : 'Month'}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Summary for Café Staff */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="outline" className="text-base py-1 px-3 bg-background">
                <Users className="h-4 w-4 mr-2 text-green-500" />
                {analytics.activeVisitors} browsing now
              </Badge>
              <Badge variant="outline" className="text-base py-1 px-3 bg-background">
                <Eye className="h-4 w-4 mr-2 text-blue-500" />
                {analytics.todaySessions} visitors {dateRange === 'today' ? 'today' : dateRange === '7days' ? 'this week' : 'this month'}
              </Badge>
              <Badge variant="outline" className="text-base py-1 px-3 bg-background">
                <ShoppingCart className="h-4 w-4 mr-2 text-purple-500" />
                {analytics.conversionRate}% ordered
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        <OverviewCards analytics={analytics} />

        {/* Live Activity + Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiveVisitorsTable visitors={visitors} />
          <VisitorsChart dateRange={dateRange} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DeviceBreakdown dateRange={dateRange} />
          <TopPagesChart dateRange={dateRange} />
          <ConversionFunnel dateRange={dateRange} />
        </div>

        {/* Visitor Details - Main Table */}
        <VisitorDetailsTable dateRange={dateRange} />

        {/* Menu Stats */}
        <MenuItemStats dateRange={dateRange} />
      </main>
    </div>
  );
};

export default AnalyticsDashboard;
