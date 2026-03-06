import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronDown,
  ChevronUp,
  Bell,
  Clock,
  User,
  Phone,
  ShoppingBag,
  FileText,
  Check,
  Calendar,
  Hash,
  CreditCard,
  Receipt,
  MapPin,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;

interface OrderWithItems extends Order {
  items: OrderItem[];
}

interface OrderTableProps {
  orders: OrderWithItems[];
  type: 'pending' | 'paid';
  unacknowledged?: Set<string>;
  onAcknowledge?: (orderId: string) => void;
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-AE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dubai',
  });
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dubai',
  });
};

const getItemsPreview = (items: OrderItem[]) => {
  if (items.length === 0) return '-';
  const names = items.slice(0, 2).map(item => item.item_name);
  const remaining = items.length - 2;
  return remaining > 0 ? `${names.join(', ')} +${remaining} more` : names.join(', ');
};

const getTotalItemCount = (items: OrderItem[]) => {
  return items.reduce((sum, item) => sum + item.quantity, 0);
};

export const OrderTable = ({
  orders,
  type,
  unacknowledged = new Set(),
  onAcknowledge,
}: OrderTableProps) => {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const isPending = type === 'pending';
  const isPaid = type === 'paid';
  const headerColor = isPending ? 'bg-yellow-50 dark:bg-yellow-950/30' : 'bg-green-50 dark:bg-green-950/30';
  const icon = isPending ? '⏳' : '✅';
  const title = isPending ? 'Pending Orders' : 'Paid Orders';

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className={`pb-3 ${headerColor}`}>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <span>{icon}</span>
          {title} ({orders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No {type} orders</p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-1 sm:pr-2">
            <div className="flex flex-col gap-3 p-2 sm:p-4">
              {orders.map((order) => {
                const isUnacked = unacknowledged.has(order.id);
                const isExpanded = expandedOrder === order.id;
                const totalItems = getTotalItemCount(order.items);

                return (
                  <div key={order.id} className="flex flex-col gap-2">
                    {/* Main Order Card (Responsive Row) */}
                    <div
                      className={`relative flex flex-col md:grid md:grid-cols-[minmax(80px,1fr)_minmax(100px,1.5fr)_minmax(120px,2fr)_minmax(120px,2fr)_minmax(80px,1fr)_minmax(100px,1fr)] gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isUnacked
                        ? 'bg-red-50/50 dark:bg-red-950/20 shadow-md border-red-200 dark:border-red-800'
                        : 'bg-card hover:bg-muted/50 hover:shadow-sm'
                        }`}
                      onClick={() => toggleExpand(order.id)}
                    >
                      {/* Left Accent Bar for Unacked */}
                      {isUnacked && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 rounded-l-xl animate-pulse" />
                      )}

                      {/* Mobile Top Row: Time & Order Number */}
                      <div className="flex items-center justify-between md:hidden pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-sm">
                            {order.order_number}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-sm">{formatTime(order.created_at)}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(order.created_at)}</span>
                        </div>
                      </div>

                      {/* Desktop Column 1: Time (Hidden on Mobile) */}
                      <div className="hidden md:flex flex-col justify-center">
                        <span className="font-semibold">{formatTime(order.created_at)}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                      </div>

                      {/* Desktop Column 2: Order Number (Hidden on Mobile) */}
                      <div className="hidden md:flex items-center">
                        <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded text-sm lg:text-base">
                          {order.order_number}
                        </span>
                      </div>

                      {/* Column 3: Customer Details */}
                      <div className="flex flex-col justify-center gap-1">
                        <div className="flex items-center gap-1.5 line-clamp-1">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm sm:text-base">{order.customer_name}</span>
                        </div>
                        {order.customer_phone && (
                          <div className="flex items-center gap-1.5 line-clamp-1">
                            <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-xs sm:text-sm text-muted-foreground">{order.customer_phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Column 4: Location & Status */}
                      <div className="flex flex-col justify-center gap-1">
                        {(order as any).customer_location ? (
                          <div className="flex items-start gap-1.5 line-clamp-2">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm leading-tight">{(order as any).customer_location}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                            <span className="text-xs sm:text-sm text-muted-foreground/50">Dine-in / Pickup</span>
                          </div>
                        )}
                      </div>

                      {/* Column 5: Items Summary */}
                      <div className="flex items-center justify-between md:flex-col md:items-start md:justify-center gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-bold shrink-0">
                            {totalItems} items
                          </Badge>
                          <span className="font-semibold text-sm md:hidden">
                            AED {order.total_amount.toFixed(2)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[150px] hidden lg:block">
                          {getItemsPreview(order.items)}
                        </span>
                      </div>

                      {/* Column 6: Actions & Total (Desktop) */}
                      <div className="flex items-center justify-between md:flex-col md:items-end md:justify-center gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-border/50 md:border-0">
                        <div className="flex items-center gap-2">
                          {isUnacked ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="animate-pulse h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAcknowledge?.(order.id);
                              }}
                            >
                              <Bell className="w-3 h-3 mr-1" /> ACK
                            </Button>
                          ) : (
                            <Badge variant="outline" className={`h-6 ${isPaid ? "bg-green-50 text-green-700 border-green-300" : "bg-yellow-50 text-yellow-700 border-yellow-300"}`}>
                              <Check className="w-3 h-3 mr-1" /> {isPaid ? 'Paid' : 'Seen'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-right">
                          <span className="font-bold hidden md:block">AED {order.total_amount.toFixed(2)}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details Panel */}
                    {isExpanded && (
                      <div className="ml-2 md:ml-8 border-l-2 border-primary/20 pl-4 py-2 animate-in slide-in-from-top-2">
                        <div className="bg-card rounded-xl border p-4 sm:p-5 space-y-5 shadow-sm">
                          {/* Customer & Order Info */}
                          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
                            <div>
                              <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
                                <Hash className="w-3 h-3" /> Order #
                              </span>
                              <p className="font-mono font-bold text-primary">{order.order_number}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
                                <Calendar className="w-3 h-3" /> Date
                              </span>
                              <p className="font-medium">{formatDate(order.created_at)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
                                <Clock className="w-3 h-3" /> Time
                              </span>
                              <p className="font-medium">{formatTime(order.created_at)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
                                <Phone className="w-3 h-3" /> Phone
                              </span>
                              <p className="font-medium">{order.customer_phone}</p>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
                                <MapPin className="w-3 h-3" /> Full Location
                              </span>
                              <p className="font-medium text-sm leading-snug">
                                {(order as any).customer_location || 'Dine-in / Pickup'}
                              </p>
                            </div>
                          </div>

                          {/* Payment Info */}
                          <div className="flex flex-wrap gap-4 items-center bg-muted/40 p-3 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs uppercase tracking-wider">Status:</span>
                              <Badge className={isPaid ? 'bg-green-500' : 'bg-yellow-500'}>
                                {order.payment_status}
                              </Badge>
                            </div>
                            {order.payment_method && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs uppercase tracking-wider">Method:</span>
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" />
                                  {order.payment_method}
                                </Badge>
                              </div>
                            )}
                            {isPaid && order.payment_reference && (
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <span className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1">
                                  <Receipt className="w-3 h-3" /> Ref:
                                </span>
                                <span className="font-mono text-xs bg-background px-2 py-1 flex-1 sm:flex-none border rounded text-primary truncate max-w-[200px]">
                                  {order.payment_reference}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Order Items List */}
                          <div>
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 border-b pb-2">
                              <ShoppingBag className="w-4 h-4 text-primary" />
                              Order Items <Badge variant="secondary" className="ml-2">{getTotalItemCount(order.items)}</Badge>
                            </h4>
                            <div className="grid gap-2 outline outline-1 outline-border rounded-lg bg-background p-1">
                              {order.items.map((item, i) => (
                                <div
                                  key={item.id}
                                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 ${i !== 0 ? 'border-t' : ''}`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-start gap-3">
                                      <div className="bg-primary/10 text-primary font-bold px-2.5 py-1 rounded mt-0.5">
                                        {item.quantity}x
                                      </div>
                                      <div>
                                        <span className="font-semibold text-base block leading-tight mb-1">{item.item_name}</span>
                                        {item.item_category && (
                                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                            {item.item_category}
                                          </Badge>
                                        )}
                                        {item.extras && (
                                          <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5 bg-muted/50 p-1.5 rounded">
                                            <span className="text-primary mt-0.5">+</span> {item.extras}
                                          </p>
                                        )}
                                        {item.notes && (
                                          <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1.5 italic bg-yellow-50 dark:bg-yellow-950/30 p-1.5 border border-yellow-200 dark:border-yellow-900/50 rounded flex items-start gap-1.5">
                                            <span className="mt-0.5">📝</span> {item.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="font-semibold text-sm sm:text-base whitespace-nowrap self-end sm:self-center bg-muted px-3 py-1.5 rounded-md">
                                    AED {item.total_price.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Customer Notes Focus */}
                          {(order.extra_notes || order.notes) && (
                            <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-xl border border-yellow-200 dark:border-yellow-900 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1.5 bottom-0 bg-yellow-400" />
                              <h4 className="font-bold text-yellow-900 dark:text-yellow-400 text-sm mb-1.5 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Customer Notes
                              </h4>
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200/90 leading-relaxed uppercase tracking-wide">
                                {order.extra_notes || order.notes}
                              </p>
                            </div>
                          )}

                          {/* Totals Summary */}
                          <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2 border-t mt-6">
                            <div className="bg-muted/50 px-4 py-2.5 rounded-lg flex justify-between items-center sm:min-w-[150px]">
                              <span className="font-semibold text-muted-foreground text-sm">Subtotal</span>
                              <span className="font-medium">AED {order.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="bg-primary px-4 py-2.5 rounded-lg flex justify-between items-center sm:min-w-[180px] shadow-sm text-primary-foreground">
                              <span className="font-bold">Total Final</span>
                              <span className="font-bold text-lg">AED {order.total_amount.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderTable;
