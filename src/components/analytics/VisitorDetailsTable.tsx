import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  Clock, 
  ShoppingCart,
  Cookie,
  ChevronDown,
  ChevronUp,
  Download,
  Eye
} from 'lucide-react';

interface VisitorDetail {
  visitor_id: string;
  device_type: string | null;
  browser: string | null;
  browser_version: string | null;
  ip_address: string | null;
  timezone: string | null;
  os: string | null;
  screen_resolution: string | null;
  last_seen_at: string;
  created_at: string;
  pages: PageDetail[];
  cart_items: number;
  has_order: boolean;
  consent_status: 'full' | 'essential' | 'unknown';
  total_time: number;
}

interface PageDetail {
  page_path: string;
  time_on_page: number | null;
  viewed_at: string;
}

interface VisitorDetailsTableProps {
  dateRange: 'today' | '7days' | '30days';
}

const getDeviceIcon = (deviceType: string | null) => {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
};

const formatTime = (seconds: number | null): string => {
  if (seconds === null || seconds === 0) return '-';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const formatTimeSince = (dateString: string): string => {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = Math.floor((now - then) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getBrowserName = (browser: string | null): string => {
  if (!browser) return '-';
  // Clean up browser names
  const name = browser.toLowerCase();
  if (name.includes('chrome')) return 'Chrome';
  if (name.includes('firefox')) return 'Firefox';
  if (name.includes('safari')) return 'Safari';
  if (name.includes('edge')) return 'Edge';
  if (name.includes('brave')) return 'Brave';
  if (name.includes('opera')) return 'Opera';
  if (name.includes('duckduckgo') || name.includes('duck')) return 'DuckDuckGo';
  if (name.includes('samsung')) return 'Samsung';
  return browser;
};

const maskIp = (ip: string | null): string => {
  if (!ip) return '-';
  // Show partial IP for privacy
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return ip;
};

export const VisitorDetailsTable = ({ dateRange }: VisitorDetailsTableProps) => {
  const [visitors, setVisitors] = useState<VisitorDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVisitor, setExpandedVisitor] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchVisitorDetails();
  }, [dateRange]);

  const fetchVisitorDetails = async () => {
    setLoading(true);
    
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
      // Fetch visitors
      const { data: visitorsData } = await supabase
        .from('anonymous_visitors')
        .select('*')
        .gte('last_seen_at', startDate.toISOString())
        .order('last_seen_at', { ascending: false });

      // Fetch page views
      const { data: pageViewsData } = await supabase
        .from('page_views')
        .select('visitor_id, page_path, time_on_page, engagement_time, viewed_at')
        .gte('viewed_at', startDate.toISOString());

      // Fetch orders via admin edge function
      const token = sessionStorage.getItem('admin_session') || '';
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const ordersResponse = await fetch(
        `${supabaseUrl}/functions/v1/admin-orders?mode=visitor_ids&start_date=${startDate.toISOString()}`,
        {
          headers: {
            'x-admin-token': token,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      const ordersResult = await ordersResponse.json();
      const ordersData = ordersResult.data || [];

      // Fetch cart events from site_events
      const { data: cartEvents } = await supabase
        .from('menu_item_views')
        .select('visitor_id, action')
        .eq('action', 'add_to_cart')
        .gte('viewed_at', startDate.toISOString());

      // Build visitor details
      const orderVisitorIds = new Set(ordersData?.map(o => o.visitor_id) || []);
      const cartCounts = new Map<string, number>();
      cartEvents?.forEach(e => {
        cartCounts.set(e.visitor_id, (cartCounts.get(e.visitor_id) || 0) + 1);
      });

      const visitorDetails: VisitorDetail[] = (visitorsData || []).map(v => {
        const visitorPages = (pageViewsData || [])
          .filter(pv => pv.visitor_id === v.visitor_id)
          .map(pv => ({
            page_path: pv.page_path,
            time_on_page: pv.time_on_page || pv.engagement_time,
            viewed_at: pv.viewed_at
          }))
          .sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime());

        // Calculate total time on site
        const totalTime = visitorPages.reduce((acc, p) => acc + (p.time_on_page || 0), 0);

        return {
          visitor_id: v.visitor_id,
          device_type: v.device_type,
          browser: v.browser,
          browser_version: v.browser_version,
          ip_address: v.ip_address,
          timezone: v.timezone,
          os: v.os,
          screen_resolution: v.screen_resolution,
          last_seen_at: v.last_seen_at,
          created_at: v.created_at,
          pages: visitorPages,
          cart_items: cartCounts.get(v.visitor_id) || 0,
          has_order: orderVisitorIds.has(v.visitor_id),
          consent_status: v.fingerprint ? 'full' : 'essential',
          total_time: totalTime
        };
      });

      setVisitors(visitorDetails);
    } catch (error) {
      console.error('Failed to fetch visitor details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Visitor ID', 'Device', 'Browser', 'IP', 'Pages Visited', 'Time on Site', 'Cart Items', 'Ordered', 'Consent', 'Last Seen'];
    const rows = visitors.map(v => [
      v.visitor_id.slice(-8),
      v.device_type || '-',
      getBrowserName(v.browser),
      v.ip_address || '-',
      v.pages.length,
      formatTime(v.total_time),
      v.cart_items,
      v.has_order ? 'Yes' : 'No',
      v.consent_status,
      new Date(v.last_seen_at).toISOString()
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayedVisitors = showAll ? visitors : visitors.slice(0, 15);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Visitor Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Visitor Details</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Browser</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Screen</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Cart</TableHead>
                <TableHead>Consent</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedVisitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                    No visitors found
                  </TableCell>
                </TableRow>
              ) : (
                displayedVisitors.map((visitor) => (
                  <>
                    <TableRow key={visitor.visitor_id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">
                        {visitor.visitor_id.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getDeviceIcon(visitor.device_type)}
                          <span className="text-xs capitalize">{visitor.device_type || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {getBrowserName(visitor.browser)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {maskIp(visitor.ip_address)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {visitor.pages.length || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatTime(visitor.total_time)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {visitor.cart_items > 0 ? (
                          <Badge variant="outline" className="text-xs">
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            {visitor.cart_items}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={visitor.consent_status === 'full' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          <Cookie className="h-3 w-3 mr-1" />
                          {visitor.consent_status === 'full' ? 'Full' : 'Ess'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimeSince(visitor.last_seen_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setExpandedVisitor(
                            expandedVisitor === visitor.visitor_id ? null : visitor.visitor_id
                          )}
                        >
                          {expandedVisitor === visitor.visitor_id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded row for page details */}
                    {expandedVisitor === visitor.visitor_id && (
                      <TableRow>
                        <TableCell colSpan={10} className="bg-muted/30 p-4">
                          <div className="space-y-3">
                            <div className="flex gap-4 text-xs">
                              <span><strong>OS:</strong> {visitor.os || '-'}</span>
                              <span><strong>Timezone:</strong> {visitor.timezone || '-'}</span>
                              <span><strong>Full IP:</strong> {visitor.ip_address || '-'}</span>
                              {visitor.has_order && (
                                <Badge variant="default" className="text-xs">
                                  ✓ Placed Order
                                </Badge>
                              )}
                            </div>
                            
                            <div>
                              <p className="text-xs font-medium mb-2">Pages Visited:</p>
                              {visitor.pages.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No page data</p>
                              ) : (
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {visitor.pages.slice(0, 10).map((page, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-xs bg-background rounded px-2 py-1">
                                      <span className="font-mono text-primary">{page.page_path}</span>
                                      <span className="text-muted-foreground">
                                        {formatTime(page.time_on_page)}
                                      </span>
                                      <span className="text-muted-foreground ml-auto">
                                        {formatTimeSince(page.viewed_at)}
                                      </span>
                                    </div>
                                  ))}
                                  {visitor.pages.length > 10 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{visitor.pages.length - 10} more pages
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {visitors.length > 15 && (
          <div className="flex justify-center mt-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show All ({visitors.length})
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
