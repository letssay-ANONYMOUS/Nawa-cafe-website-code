import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, TrendingUp, Calendar, CalendarDays, CalendarRange, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaidOrder {
  total_amount: number;
  paid_at: string | null;
  created_at: string;
}

const formatAED = (n: number) =>
  `AED ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const RevenueCalculator = () => {
  const [orders, setOrders] = useState<PaidOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("total_amount, paid_at, created_at")
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (!error && data) setOrders(data as PaidOrder[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let today = 0, todayCount = 0;
    let week = 0, weekCount = 0;
    let month = 0, monthCount = 0;
    let allTime = 0;

    for (const o of orders) {
      const d = new Date(o.paid_at || o.created_at);
      const amt = Number(o.total_amount) || 0;
      allTime += amt;
      if (d >= startOfDay) { today += amt; todayCount++; }
      if (d >= weekAgo) { week += amt; weekCount++; }
      if (d >= monthAgo) { month += amt; monthCount++; }
    }

    const avgPerDay = month / 30;
    const avgPerWeek = month / 30 * 7;

    return {
      today, todayCount,
      week, weekCount,
      month, monthCount,
      allTime, totalCount: orders.length,
      avgPerDay, avgPerWeek,
      avgOrder: orders.length ? allTime / orders.length : 0,
    };
  }, [orders]);

  const tiles = [
    { label: "Today's Gains", value: formatAED(stats.today), sub: `${stats.todayCount} orders today`, icon: Calendar, color: "text-green-600", bg: "bg-green-50" },
    { label: "This Week (7 days)", value: formatAED(stats.week), sub: `${stats.weekCount} orders`, icon: CalendarDays, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "This Month (30 days)", value: formatAED(stats.month), sub: `${stats.monthCount} orders`, icon: CalendarRange, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Avg / Day", value: formatAED(stats.avgPerDay), sub: "Based on last 30 days", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Avg / Week", value: formatAED(stats.avgPerWeek), sub: "Projected weekly", icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Avg Order Value", value: formatAED(stats.avgOrder), sub: `${stats.totalCount} total paid orders`, icon: Calculator, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calculator className="w-5 h-5" /> Revenue Calculator
          </h2>
          <p className="text-sm text-muted-foreground">Auto-calculated gains from paid orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Card key={t.label} className="overflow-hidden">
            <CardHeader className={`${t.bg} pb-3`}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-foreground/80">{t.label}</CardTitle>
                <t.icon className={`w-5 h-5 ${t.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All-Time Total</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">{formatAED(stats.allTime)}</p>
          <p className="text-sm text-muted-foreground mt-1">From {stats.totalCount} paid orders (last 1000 max)</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueCalculator;
