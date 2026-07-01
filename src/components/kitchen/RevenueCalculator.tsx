import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Calendar,
  CalendarDays,
  CalendarRange,
  RefreshCw,
  Wallet,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaidOrder {
  total_amount: number;
  paid_at: string | null;
  created_at: string;
}

const formatAED = (n: number) =>
  `AED ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatAEDShort = (n: number) => {
  if (n >= 1000) return `AED ${(n / 1000).toFixed(1)}k`;
  return `AED ${n.toFixed(0)}`;
};

type RangeGrouping = "day" | "week" | "month";
type QuickRange = "today" | "thisWeek" | "thisMonth" | "last30" | "yearToDate";

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateInputValue = (date: Date) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};

const startOfLocalDay = (value: string) => {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfLocalDay = (value: string) => {
  const date = value ? new Date(`${value}T23:59:59.999`) : new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + mondayOffset);
  return copy;
};

const applyQuickRange = (range: QuickRange) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (range === "today") {
    return { start: toDateInputValue(now), end: toDateInputValue(now), grouping: "day" as RangeGrouping };
  }
  if (range === "thisWeek") {
    return { start: toDateInputValue(startOfWeek(now)), end: toDateInputValue(now), grouping: "day" as RangeGrouping };
  }
  if (range === "thisMonth") {
    start.setDate(1);
    return { start: toDateInputValue(start), end: toDateInputValue(now), grouping: "day" as RangeGrouping };
  }
  if (range === "yearToDate") {
    start.setMonth(0, 1);
    return { start: toDateInputValue(start), end: toDateInputValue(now), grouping: "month" as RangeGrouping };
  }

  start.setDate(start.getDate() - 29);
  return { start: toDateInputValue(start), end: toDateInputValue(now), grouping: "day" as RangeGrouping };
};

const getOrderDate = (order: PaidOrder) => new Date(order.paid_at || order.created_at);

const getBucketKey = (date: Date, grouping: RangeGrouping) => {
  if (grouping === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  if (grouping === "week") {
    const start = startOfWeek(date);
    return toDateInputValue(start);
  }
  return toDateInputValue(date);
};

const getBucketLabel = (date: Date, grouping: RangeGrouping) => {
  if (grouping === "month") {
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }
  if (grouping === "week") {
    return `Week of ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// Animated number counter
const AnimatedNumber = ({ value, duration = 900 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const from = display;
    const delta = value - from;
    let raf = 0;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{formatAED(display)}</>;
};

export const RevenueCalculator = () => {
  const [orders, setOrders] = useState<PaidOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const defaultRange = applyQuickRange("thisMonth");
  const [rangeStart, setRangeStart] = useState(defaultRange.start);
  const [rangeEnd, setRangeEnd] = useState(defaultRange.end);
  const [rangeGrouping, setRangeGrouping] = useState<RangeGrouping>(defaultRange.grouping);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("total_amount, paid_at, created_at")
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .range(0, 9999);
    if (!error && data) setOrders(data as PaidOrder[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevWeekAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prevMonthAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    let today = 0,
      todayCount = 0;
    let yesterday = 0;
    let week = 0,
      weekCount = 0;
    let prevWeek = 0;
    let month = 0,
      monthCount = 0;
    let prevMonth = 0;
    let allTime = 0;

    // Daily buckets last 14 days
    const daily: { key: string; label: string; total: number; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(startOfDay.getTime() - i * 24 * 60 * 60 * 1000);
      daily.push({
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
        total: 0,
        count: 0,
      });
    }
    const dailyMap = new Map(daily.map((b) => [b.key, b]));

    // Hourly buckets today
    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, total: 0 }));

    for (const o of orders) {
      const d = getOrderDate(o);
      const amt = Number(o.total_amount) || 0;
      allTime += amt;
      if (d >= startOfDay) {
        today += amt;
        todayCount++;
        hourly[d.getHours()].total += amt;
      }
      if (d >= startOfYesterday && d < startOfDay) yesterday += amt;
      if (d >= weekAgo) {
        week += amt;
        weekCount++;
      }
      if (d >= prevWeekAgo && d < weekAgo) prevWeek += amt;
      if (d >= monthAgo) {
        month += amt;
        monthCount++;
      }
      if (d >= prevMonthAgo && d < monthAgo) prevMonth += amt;

      const key = d.toISOString().slice(0, 10);
      const bucket = dailyMap.get(key);
      if (bucket) {
        bucket.total += amt;
        bucket.count += 1;
      }
    }

    const pct = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

    const avgPerDay = month / 30;
    const avgPerWeek = avgPerDay * 7;

    return {
      today,
      todayCount,
      yesterday,
      week,
      weekCount,
      prevWeek,
      month,
      monthCount,
      prevMonth,
      allTime,
      totalCount: orders.length,
      avgPerDay,
      avgPerWeek,
      avgOrder: orders.length ? allTime / orders.length : 0,
      todayDelta: pct(today, yesterday),
      weekDelta: pct(week, prevWeek),
      monthDelta: pct(month, prevMonth),
      daily,
      hourly,
    };
  }, [orders]);

  const rangeStats = useMemo(() => {
    const start = startOfLocalDay(rangeStart);
    const end = endOfLocalDay(rangeEnd);
    const validRange = start <= end;
    const buckets = new Map<string, { key: string; label: string; total: number; count: number }>();
    let total = 0;
    let count = 0;

    if (!validRange) {
      return {
        validRange,
        total,
        count,
        avgPerDay: 0,
        avgPerWeek: 0,
        avgOrder: 0,
        days: 0,
        chart: [] as { key: string; label: string; total: number; count: number }[],
        label: "Choose a valid range",
      };
    }

    for (const order of orders) {
      const date = getOrderDate(order);
      if (date < start || date > end) continue;
      const amount = Number(order.total_amount) || 0;
      total += amount;
      count += 1;

      const key = getBucketKey(date, rangeGrouping);
      const bucketDate = rangeGrouping === "week" ? startOfWeek(date) : date;
      const existing = buckets.get(key);
      if (existing) {
        existing.total += amount;
        existing.count += 1;
      } else {
        buckets.set(key, {
          key,
          label: getBucketLabel(bucketDate, rangeGrouping),
          total: amount,
          count: 1,
        });
      }
    }

    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime() + 1) / DAY_MS));
    const sortedBuckets = Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
    const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const endLabel = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

    return {
      validRange,
      total,
      count,
      avgPerDay: total / days,
      avgPerWeek: (total / days) * 7,
      avgOrder: count ? total / count : 0,
      days,
      chart: sortedBuckets,
      label: `${startLabel} - ${endLabel}`,
    };
  }, [orders, rangeEnd, rangeGrouping, rangeStart]);

  const handleQuickRange = (range: QuickRange) => {
    const next = applyQuickRange(range);
    setRangeStart(next.start);
    setRangeEnd(next.end);
    setRangeGrouping(next.grouping);
  };

  const tiles = [
    {
      label: "Today",
      value: stats.today,
      sub: `${stats.todayCount} orders`,
      delta: stats.todayDelta,
      icon: Calendar,
      gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
      accent: "text-emerald-600",
      ring: "ring-emerald-500/20",
    },
    {
      label: "This Week",
      value: stats.week,
      sub: `${stats.weekCount} orders · last 7d`,
      delta: stats.weekDelta,
      icon: CalendarDays,
      gradient: "from-sky-500/15 via-sky-500/5 to-transparent",
      accent: "text-sky-600",
      ring: "ring-sky-500/20",
    },
    {
      label: "This Month",
      value: stats.month,
      sub: `${stats.monthCount} orders · last 30d`,
      delta: stats.monthDelta,
      icon: CalendarRange,
      gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
      accent: "text-violet-600",
      ring: "ring-violet-500/20",
    },
    {
      label: "Avg / Day",
      value: stats.avgPerDay,
      sub: "Rolling 30-day avg",
      icon: TrendingUp,
      gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
      accent: "text-amber-600",
      ring: "ring-amber-500/20",
    },
    {
      label: "Avg / Week",
      value: stats.avgPerWeek,
      sub: "Projected weekly",
      icon: TrendingUp,
      gradient: "from-orange-500/15 via-orange-500/5 to-transparent",
      accent: "text-orange-600",
      ring: "ring-orange-500/20",
    },
    {
      label: "Avg Order Value",
      value: stats.avgOrder,
      sub: `${stats.totalCount} paid orders`,
      icon: ShoppingBag,
      gradient: "from-rose-500/15 via-rose-500/5 to-transparent",
      accent: "text-rose-600",
      ring: "ring-rose-500/20",
    },
  ];

  // Split for pie chart: today vs rest of week
  const weekSplit = [
    { name: "Today", value: Math.max(0, stats.today) },
    { name: "Rest of week", value: Math.max(0, stats.week - stats.today) },
  ];
  const pieColors = ["hsl(var(--primary))", "hsl(var(--muted))"];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 220, damping: 22 } },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-primary/30 blur-lg animate-pulse" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Revenue Insights
              <Sparkles className="w-4 h-4 text-primary" />
            </h2>
            <p className="text-sm text-muted-foreground">Live gains from paid orders</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Editable range controls */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-primary" />
            Profit time frame
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start date</label>
              <Input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">End date</label>
              <Input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Group chart by</label>
              <Select value={rangeGrouping} onValueChange={(value) => setRangeGrouping(value as RangeGrouping)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Days</SelectItem>
                  <SelectItem value="week">Weeks</SelectItem>
                  <SelectItem value="month">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickRange("today")}>
                Today
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickRange("thisWeek")}>
                Week
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickRange("thisMonth")}>
                Month
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickRange("last30")}>
                30 days
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickRange("yearToDate")}>
                Year
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <Card className="bg-primary/5 border-primary/15">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Selected profit</p>
                <p className="mt-1 text-2xl font-bold text-primary tabular-nums">
                  <AnimatedNumber value={rangeStats.total} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">{rangeStats.label}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Paid orders</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{rangeStats.count}</p>
                <p className="text-xs text-muted-foreground mt-1">{rangeStats.days} days included</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Avg / day</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{formatAED(rangeStats.avgPerDay)}</p>
                <p className="text-xs text-muted-foreground mt-1">Across selected range</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Avg order</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{formatAED(rangeStats.avgOrder)}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatAED(rangeStats.avgPerWeek)} / week avg</p>
              </CardContent>
            </Card>
          </div>

          {!rangeStats.validRange && (
            <p className="text-sm font-medium text-destructive">
              Start date must be before the end date.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Selected range profit
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Grouped by {rangeGrouping === "day" ? "day" : rangeGrouping === "week" ? "week" : "month"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rangeStats.chart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rangeBarFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={14}
                />
                <YAxis
                  tickFormatter={formatAEDShort}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [formatAED(v), "Profit"]}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar
                  dataKey="total"
                  fill="url(#rangeBarFill)"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive
                  animationDuration={900}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hero all-time card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 22 }}
      >
        <Card className="relative overflow-hidden border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
          <CardContent className="relative p-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Wallet className="w-3.5 h-3.5" />
                All-Time Revenue
              </div>
              <p className="mt-2 text-4xl md:text-5xl font-bold text-primary tabular-nums">
                <AnimatedNumber value={stats.allTime} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                From {stats.totalCount} paid orders
              </p>
            </div>
            <div className="w-full sm:w-64 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.daily}>
                  <defs>
                    <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#heroFill)"
                    isAnimationActive
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stat tiles */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <AnimatePresence>
          {tiles.map((t) => {
            const positive = (t.delta ?? 0) >= 0;
            return (
              <motion.div key={t.label} variants={item} whileHover={{ y: -3 }}>
                <Card
                  className={`relative overflow-hidden ring-1 ${t.ring} hover:shadow-lg transition-shadow`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient}`} />
                  <CardHeader className="relative pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        {t.label}
                      </CardTitle>
                      <div className={`p-2 rounded-lg bg-background/60 backdrop-blur ${t.accent}`}>
                        <t.icon className="w-4 h-4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative pt-0">
                    <p className={`text-2xl font-bold tabular-nums ${t.accent}`}>
                      <AnimatedNumber value={t.value} />
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-xs text-muted-foreground">{t.sub}</p>
                      {t.delta !== undefined && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                            positive
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-rose-500/15 text-rose-600"
                          }`}
                        >
                          {positive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {Math.abs(t.delta).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Last 14 days revenue
                </CardTitle>
                <span className="text-xs text-muted-foreground">AED per day</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.daily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatAEDShort}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [formatAED(v), "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#dailyFill)"
                      isAnimationActive
                      animationDuration={1100}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Today vs Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={weekSplit}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="none"
                      isAnimationActive
                      animationDuration={1000}
                    >
                      {weekSplit.map((_, i) => (
                        <Cell key={i} fill={pieColors[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatAED(v)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Week</p>
                  <p className="text-lg font-bold tabular-nums">{formatAEDShort(stats.week)}</p>
                </div>
              </div>
              <div className="flex items-center justify-around mt-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted" />
                  <span className="text-muted-foreground">Earlier</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Hourly today */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Today by hour
              </CardTitle>
              <span className="text-xs text-muted-foreground">{stats.todayCount} orders</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hourly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis
                    tickFormatter={formatAEDShort}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [formatAED(v), "Revenue"]}
                  />
                  <Bar
                    dataKey="total"
                    fill="url(#barFill)"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default RevenueCalculator;
