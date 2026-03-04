import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
          <div className="max-h-[calc(100vh-280px)] overflow-x-auto overflow-y-auto">
            <Table className="min-w-[500px] sm:min-w-0">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[80px] sm:w-[100px]">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 hidden sm:inline" />
                      <span className="text-xs sm:text-sm">Time</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Hash className="w-3 h-3 hidden sm:inline" />
                      <span className="text-xs sm:text-sm">Order</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Customer
                    </div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Phone
                    </div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Location
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <ShoppingBag className="w-3 h-3" />
                      Items
                    </div>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-xs sm:text-sm">What They Ordered</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Total</TableHead>
                  {isPaid && (
                    <TableHead className="hidden xl:table-cell">
                      <div className="flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        Invoice
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="w-[70px] sm:w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const isUnacked = unacknowledged.has(order.id);
                  const isExpanded = expandedOrder === order.id;
                  const totalItems = getTotalItemCount(order.items);
                  
                  return (
                    <>
                      <TableRow
                        key={order.id}
                        className={`cursor-pointer transition-all ${
                          isUnacked 
                            ? 'bg-red-50 dark:bg-red-950/20 animate-pulse border-l-4 border-l-red-500' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleExpand(order.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1">
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                              <span className="font-semibold">{formatTime(order.created_at)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs sm:text-sm font-bold text-primary">{order.order_number}</span>
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          {order.customer_name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {order.customer_phone}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {(order as any).customer_location ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3 text-primary" />
                              {(order as any).customer_location}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-bold">
                            {totalItems}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm max-w-[200px] truncate text-muted-foreground">
                          {getItemsPreview(order.items)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-xs sm:text-sm">
                          AED {order.total_amount.toFixed(2)}
                        </TableCell>
                        {isPaid && (
                          <TableCell className="hidden xl:table-cell">
                            {order.payment_reference ? (
                              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                {order.payment_reference.slice(0, 12)}...
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {isUnacked ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="animate-pulse"
                              onClick={() => onAcknowledge?.(order.id)}
                            >
                              <Bell className="w-3 h-3 mr-1" />
                              ACK
                            </Button>
                          ) : (
                            <Badge variant="outline" className={isPaid ? "bg-green-50 text-green-700 border-green-300" : "bg-yellow-50 text-yellow-700 border-yellow-300"}>
                              <Check className="w-3 h-3 mr-1" />
                              {isPaid ? 'Done' : 'Seen'}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={isPaid ? 10 : 8} className="p-4">
                            <div className="bg-card rounded-lg border p-4 space-y-4">
                              {/* Customer & Order Info */}
                              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 lg:grid-cols-6">
                                <div>
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Hash className="w-3 h-3" /> Order #
                                  </span>
                                  <p className="font-mono font-bold text-primary">{order.order_number}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" /> Visitor ID
                                  </span>
                                  <p className="font-mono text-xs truncate max-w-[100px]" title={order.visitor_id}>
                                    {order.visitor_id.slice(0, 8)}...
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Date
                                  </span>
                                  <p className="font-medium">{formatDate(order.created_at)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Time
                                  </span>
                                  <p className="font-medium">{formatTime(order.created_at)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Phone
                                  </span>
                                  <p className="font-medium">{order.customer_phone}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Email</span>
                                  <p className="font-medium truncate">{order.customer_email || '-'}</p>
                                </div>
                              </div>

                              {/* Location & IP Info */}
                              {((order as any).customer_location || (order as any).ip_address) && (
                                <div className="flex flex-wrap gap-4 items-center border-t py-3">
                                  {(order as any).customer_location && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground text-sm flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Location:
                                      </span>
                                      <span className="font-medium">{(order as any).customer_location}</span>
                                    </div>
                                  )}
                                  {(order as any).ip_address && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground text-sm">IP Address:</span>
                                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{(order as any).ip_address}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Order Type & Payment Info */}
                              <div className="flex flex-wrap gap-4 items-center border-t border-b py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-sm">Type:</span>
                                  <Badge variant="outline" className="font-medium">
                                    🍽️ Dine In
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-sm">Status:</span>
                                  <Badge className={isPaid ? 'bg-green-500' : 'bg-yellow-500'}>
                                    {order.payment_status}
                                  </Badge>
                                </div>
                                {order.payment_method && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">Method:</span>
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <CreditCard className="w-3 h-3" />
                                      {order.payment_method}
                                    </Badge>
                                  </div>
                                )}
                                {order.payment_provider && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">Provider:</span>
                                    <span className="font-medium">{order.payment_provider}</span>
                                  </div>
                                )}
                                {isPaid && order.payment_reference && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm flex items-center gap-1">
                                      <Receipt className="w-3 h-3" /> Invoice:
                                    </span>
                                    <span className="font-mono text-xs bg-primary/10 px-2 py-1 rounded text-primary">
                                      {order.payment_reference}
                                    </span>
                                  </div>
                                )}
                                {order.paid_at && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">Paid at:</span>
                                    <span className="font-medium">
                                      {formatDate(order.paid_at)} {formatTime(order.paid_at)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Order Items */}
                              <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                  <ShoppingBag className="w-4 h-4" />
                                  Order Items ({getTotalItemCount(order.items)} total)
                                </h4>
                                <div className="grid gap-2">
                                  {order.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-primary">{item.quantity}x</span>
                                          <span className="font-medium">{item.item_name}</span>
                                          {item.item_category && (
                                            <Badge variant="outline" className="text-xs">
                                              {item.item_category}
                                            </Badge>
                                          )}
                                        </div>
                                        {item.extras && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            ➕ Extras: {item.extras}
                                          </p>
                                        )}
                                        {item.notes && (
                                          <p className="text-sm text-primary mt-1 italic bg-primary/10 px-2 py-1 rounded">
                                            📝 Note: {item.notes}
                                          </p>
                                        )}
                                      </div>
                                      <span className="font-semibold text-sm">
                                        AED {item.total_price.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Order Notes */}
                              {(order.extra_notes || order.notes) && (
                                <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900">
                                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Customer Notes
                                  </h4>
                                  <p className="text-sm">{order.extra_notes || order.notes}</p>
                                </div>
                              )}

                              {/* Summary */}
                              <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center">
                                <span className="font-semibold">Subtotal:</span>
                                <span>AED {order.subtotal.toFixed(2)}</span>
                              </div>
                              <div className="bg-primary/10 p-3 rounded-lg flex justify-between items-center">
                                <span className="font-bold text-lg">Total:</span>
                                <span className="font-bold text-lg text-primary">AED {order.total_amount.toFixed(2)}</span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderTable;
