import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Minus, RefreshCw, Package, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StoreCardEditModal, type StoreCardData } from './StoreCardEditModal';
import { STORE_CATEGORIES, type StoreCategory } from '@/data/storeCatalog';

export function StockManager() {
  const [products, setProducts] = useState<StoreCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<Record<number, string>>({});
  const [activeCategory, setActiveCategory] = useState<StoreCategory>('oil');
  const [editing, setEditing] = useState<StoreCardData | null>(null);
  const { toast } = useToast();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load stock' });
    } else {
      setProducts((data as unknown as StoreCardData[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const updateStock = async (product: StoreCardData, delta: number) => {
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

  const handleCustomAdjust = async (product: StoreCardData, add: boolean) => {
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

  const filtered = products.filter(p => (p.category ?? 'oil') === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5" />
          Store Stock Management
        </h2>
        <Button variant="outline" size="sm" onClick={loadProducts}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Category tabs (mirror public Store page) */}
      <div className="flex flex-wrap gap-3 mb-6">
        {STORE_CATEGORIES.map(cat => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.id ? 'default' : 'outline'}
            onClick={() => setActiveCategory(cat.id)}
            className={activeCategory === cat.id
              ? 'bg-coffee-600 hover:bg-coffee-700 text-white rounded-full px-6'
              : 'border-coffee-300 text-coffee-700 hover:bg-coffee-50 rounded-full px-6'}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <Card key={product.id} className="border-coffee-200 overflow-hidden flex flex-col">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-coffee-50 to-cream-100 overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-coffee-400 text-sm">No image</div>
              )}
              {product.coming_soon && (
                <div className="absolute top-2 left-2 bg-coffee-900/80 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  Coming Soon
                </div>
              )}
              {product.badge && (
                <div className="absolute top-2 right-2 bg-coffee-600 text-white text-[10px] px-2 py-1 rounded-full">
                  {product.badge}
                </div>
              )}
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
                {product.product_name}
              </CardTitle>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>AED {product.price}</span>
                <span>{product.volume}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 mt-auto">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Stock</span>
                <span className={`text-xl font-bold ${product.stock_quantity === 0 ? 'text-destructive' : product.stock_quantity < 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {product.stock_quantity}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => updateStock(product, -1)} disabled={product.stock_quantity === 0} className="flex-1">
                  <Minus className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateStock(product, 1)} className="flex-1">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

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

              <Button
                variant="outline"
                size="sm"
                className="w-full border-coffee-300 text-coffee-700 hover:bg-coffee-50"
                onClick={() => setEditing(product)}
              >
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Card
              </Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full">No products in this category yet.</p>
        )}
      </div>

      <StoreCardEditModal
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        product={editing}
        onSaved={loadProducts}
      />
    </div>
  );
}
