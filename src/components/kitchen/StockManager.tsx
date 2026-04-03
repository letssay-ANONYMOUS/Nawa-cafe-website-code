import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Minus, RefreshCw, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StoreProduct {
  id: string;
  product_key: number;
  product_name: string;
  stock_quantity: number;
}

export function StockManager() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<Record<number, string>>({});
  const { toast } = useToast();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_products')
      .select('*')
      .order('product_key', { ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load stock' });
    } else {
      setProducts((data as unknown as StoreProduct[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const updateStock = async (product: StoreProduct, delta: number) => {
    const newQty = Math.max(0, product.stock_quantity + delta);
    const { error } = await supabase
      .from('store_products')
      .update({ stock_quantity: newQty })
      .eq('id', product.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update stock' });
    } else {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock_quantity: newQty } : p));
      toast({ title: 'Stock Updated', description: `${product.product_name}: ${newQty} in stock` });
    }
  };

  const handleCustomAdjust = async (product: StoreProduct, add: boolean) => {
    const val = parseInt(adjustments[product.product_key] || '0', 10);
    if (isNaN(val) || val <= 0) return;
    await updateStock(product, add ? val : -val);
    setAdjustments(prev => ({ ...prev, [product.product_key]: '' }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5" />
          Store Stock Management
        </h2>
        <Button variant="outline" size="sm" onClick={loadProducts}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium leading-tight">
                {product.product_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Current Stock</span>
                <span className={`text-2xl font-bold ${product.stock_quantity === 0 ? 'text-destructive' : product.stock_quantity < 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {product.stock_quantity}
                </span>
              </div>

              {/* Quick +1 / -1 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStock(product, -1)}
                  disabled={product.stock_quantity === 0}
                  className="flex-1"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStock(product, 1)}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Custom amount */}
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={adjustments[product.product_key] || ''}
                  onChange={(e) => setAdjustments(prev => ({ ...prev, [product.product_key]: e.target.value }))}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="default" className="h-8 text-xs px-2" onClick={() => handleCustomAdjust(product, true)}>
                  +Add
                </Button>
                <Button size="sm" variant="destructive" className="h-8 text-xs px-2" onClick={() => handleCustomAdjust(product, false)}>
                  -Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
