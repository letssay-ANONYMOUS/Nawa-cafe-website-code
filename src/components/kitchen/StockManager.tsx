import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ImageIcon, Minus, Package, Plus, RefreshCw, Save, Star, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { STORE_CATEGORIES, type StoreCategory } from '@/data/storeCatalog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface StoreCardData {
  id: string;
  product_key: number;
  product_name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  volume: string | null;
  origin: string | null;
  badge: string | null;
  rating: number;
  coming_soon: boolean;
  category: string;
  stock_quantity: number;
}

type EditableStoreCard = Partial<StoreCardData>;

const CATEGORY_KEY = 'kitchen_stock_category';

const getProductKeyFromPath = (pathname: string) => {
  const match = pathname.match(/\/admin\/kitchen\/stock\/(\d+)/);
  return match ? Number(match[1]) : null;
};

const isStoreCategory = (value: string | null): value is StoreCategory =>
  !!value && STORE_CATEGORIES.some((category) => category.id === value);

const stockToneClass = (quantity: number) => {
  if (quantity === 0) return 'text-destructive';
  if (quantity < 5) return 'text-yellow-600';
  return 'text-green-600';
};

export function StockManager() {
  const [products, setProducts] = useState<StoreCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adjustment, setAdjustment] = useState('');
  const [form, setForm] = useState<EditableStoreCard>({});
  const [activeCategory, setActiveCategory] = useState<StoreCategory>(() => {
    const saved = localStorage.getItem(CATEGORY_KEY);
    return isStoreCategory(saved) ? saved : 'oil';
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const selectedProductKey = getProductKeyFromPath(location.pathname);

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

  const selectedProduct = useMemo(
    () => products.find((product) => product.product_key === selectedProductKey) ?? null,
    [products, selectedProductKey]
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setForm(selectedProduct);
    if (isStoreCategory(selectedProduct.category)) {
      setActiveCategory(selectedProduct.category);
      localStorage.setItem(CATEGORY_KEY, selectedProduct.category);
    }
  }, [selectedProduct]);

  const filtered = products.filter((product) => (product.category ?? 'oil') === activeCategory);
  const activeCategoryConfig = STORE_CATEGORIES.find((category) => category.id === activeCategory) ?? STORE_CATEGORIES[0];

  const handleCategoryChange = (category: StoreCategory) => {
    localStorage.setItem(CATEGORY_KEY, category);
    setActiveCategory(category);
    navigate('/admin/kitchen/stock');
  };

  const openProduct = (product: StoreCardData) => {
    if (isStoreCategory(product.category)) {
      localStorage.setItem(CATEGORY_KEY, product.category);
      setActiveCategory(product.category);
    }
    navigate(`/admin/kitchen/stock/${product.product_key}`);
  };

  const updateStock = async (product: StoreCardData, delta: number) => {
    const newQty = Math.max(0, product.stock_quantity + delta);
    const { error } = await supabase
      .from('store_products')
      .update({ stock_quantity: newQty })
      .eq('id', product.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update stock' });
      return;
    }

    setProducts((prev) => prev.map((item) => item.id === product.id ? { ...item, stock_quantity: newQty } : item));
    setForm((prev) => ({ ...prev, stock_quantity: newQty }));
    toast({ title: 'Stock Updated', description: `${product.product_name}: ${newQty} in stock` });
  };

  const handleCustomAdjust = async (product: StoreCardData, add: boolean) => {
    const val = parseInt(adjustment || '0', 10);
    if (Number.isNaN(val) || val <= 0) return;
    await updateStock(product, add ? val : -val);
    setAdjustment('');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `store/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
      setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
      toast({ title: 'Image uploaded' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not upload image.';
      toast({ variant: 'destructive', title: 'Upload failed', description: message });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    const updates = {
      product_name: form.product_name || selectedProduct.product_name,
      description: form.description ?? '',
      price: Number(form.price ?? 0),
      image_url: form.image_url ?? null,
      volume: form.volume ?? '',
      origin: form.origin ?? '',
      badge: form.badge ?? '',
      coming_soon: !!form.coming_soon,
      stock_quantity: Math.max(0, Number(form.stock_quantity ?? 0)),
    };

    const { error } = await supabase
      .from('store_products')
      .update(updates)
      .eq('id', selectedProduct.id);

    setSaving(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Save failed', description: error.message });
      return;
    }

    setProducts((prev) => prev.map((item) => item.id === selectedProduct.id ? { ...item, ...updates } : item));
    setForm((prev) => ({ ...prev, ...updates }));
    toast({ title: 'Saved', description: 'Card page updated.' });
  };

  const handleCreate = async () => {
    try {
      const maxKey = products.reduce((m, p) => (p.product_key > m ? p.product_key : m), 0);
      const nextKey = Math.max(maxKey + 1, 1);
      const maxSort = products.reduce((m, p) => {
        const s = (p as unknown as { sort_order?: number }).sort_order ?? 0;
        return s > m ? s : m;
      }, 0);
      const { data, error } = await supabase
        .from('store_products')
        .insert({
          product_key: nextKey,
          product_name: 'New Product',
          description: '',
          price: 0,
          category: activeCategory,
          stock_quantity: 0,
          sort_order: maxSort + 1,
          coming_soon: false,
          rating: 5,
        })
        .select()
        .single();
      if (error) throw error;
      await loadProducts();
      toast({ title: 'Product created', description: `Product #${nextKey} added.` });
      if (data) navigate(`/admin/kitchen/stock/${nextKey}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create product.';
      toast({ variant: 'destructive', title: 'Create failed', description: msg });
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    try {
      const { error } = await supabase.from('store_products').delete().eq('id', selectedProduct.id);
      if (error) throw error;
      await loadProducts();
      toast({ title: 'Product deleted', description: `${selectedProduct.product_name} removed.` });
      navigate('/admin/kitchen/stock');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete product.';
      toast({ variant: 'destructive', title: 'Delete failed', description: msg });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedProductKey && selectedProduct) {
    const previewImage = form.image_url || selectedProduct.image_url || '';
    const previewName = form.product_name || selectedProduct.product_name;
    const previewDescription = form.description ?? selectedProduct.description ?? '';
    const previewPrice = Number(form.price ?? selectedProduct.price ?? 0);
    const previewVolume = form.volume ?? selectedProduct.volume ?? '';
    const previewOrigin = form.origin ?? selectedProduct.origin ?? '';
    const previewBadge = form.badge ?? selectedProduct.badge ?? '';
    const previewComingSoon = !!(form.coming_soon ?? selectedProduct.coming_soon);
    const previewStock = Number(form.stock_quantity ?? selectedProduct.stock_quantity ?? 0);

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/admin/kitchen/stock')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stock Cards
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadProducts}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving…' : 'Save Card'}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(280px,420px)_1fr]">
          <Card className="border-coffee-200 overflow-hidden self-start">
            <div className="relative overflow-hidden bg-gradient-to-br from-coffee-50 to-cream-100 aspect-[4/3]">
              {previewImage ? (
                <img src={previewImage} alt={previewName} className="store-img is-loaded w-full h-full object-cover" loading="eager" decoding="async" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              {previewBadge && (
                <Badge className="absolute top-4 right-4 bg-coffee-600 text-white border-0">
                  {previewBadge}
                </Badge>
              )}
              {previewComingSoon && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="bg-coffee-900/80 text-white font-playfair font-bold text-xl px-6 py-3 rounded-full shadow-2xl rotate-[-8deg] border-2 border-cream-100">
                    Coming Soon
                  </div>
                </div>
              )}
            </div>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-1">
                  {[...Array(Math.max(1, Number(form.rating ?? selectedProduct.rating ?? 5)))].slice(0, 5).map((_, index) => (
                    <Star key={index} className="w-4 h-4 fill-coffee-500 text-coffee-500" />
                  ))}
                </div>
                {previewOrigin && <span className="text-sm text-coffee-600">{previewOrigin}</span>}
              </div>
              <CardTitle className="font-playfair text-2xl text-coffee-900 leading-tight">{previewName}</CardTitle>
              <CardDescription className="text-coffee-700 leading-relaxed">{previewDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-3">
                <span className="text-3xl font-bold text-coffee-600">AED {previewPrice}</span>
                {previewVolume && <span className="text-coffee-600">{previewVolume}</span>}
              </div>
              <div className={`mt-4 text-lg font-bold ${stockToneClass(previewStock)}`}>
                {previewStock === 0 ? '● Out of Stock' : `● ${previewStock} in stock`}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-coffee-600/60 text-white rounded-full cursor-not-allowed" disabled>
                Coming Soon
              </Button>
            </CardFooter>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="border-coffee-200">
              <CardHeader>
                <CardTitle>Edit Card Details</CardTitle>
                <CardDescription>Changes here update the public store card and detail page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.product_name ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, product_name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea rows={5} value={form.description ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Price (AED)</Label>
                    <Input type="number" min="0" value={form.price ?? 0} onChange={(event) => setForm((prev) => ({ ...prev, price: Number(event.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Size / Volume</Label>
                    <Input value={form.volume ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, volume: event.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Origin</Label>
                    <Input value={form.origin ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, origin: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Badge</Label>
                    <Input value={form.badge ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, badge: event.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label>Coming Soon</Label>
                    <p className="text-xs text-muted-foreground">Shows the same overlay used on store cards.</p>
                  </div>
                  <Switch checked={previewComingSoon} onCheckedChange={(value) => setForm((prev) => ({ ...prev, coming_soon: value }))} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-coffee-200">
              <CardHeader>
                <CardTitle>Image & Stock</CardTitle>
                <CardDescription>Upload a new product image and manage inventory.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Image</Label>
                  <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center transition hover:bg-muted">
                    <Upload className="w-6 h-6 text-primary" />
                    <span className="text-sm font-medium">{uploading ? 'Uploading…' : 'Upload new image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                  <Input
                    placeholder="Or paste image URL"
                    value={form.image_url ?? ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Exact Stock Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.stock_quantity ?? 0}
                    onChange={(event) => setForm((prev) => ({ ...prev, stock_quantity: Math.max(0, Number(event.target.value)) }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => updateStock(selectedProduct, -1)} disabled={selectedProduct.stock_quantity === 0}>
                    <Minus className="w-4 h-4 mr-2" /> One
                  </Button>
                  <Button variant="outline" onClick={() => updateStock(selectedProduct, 1)}>
                    <Plus className="w-4 h-4 mr-2" /> One
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={adjustment}
                    onChange={(event) => setAdjustment(event.target.value)}
                  />
                  <Button onClick={() => handleCustomAdjust(selectedProduct, true)}>+Add</Button>
                  <Button variant="destructive" onClick={() => handleCustomAdjust(selectedProduct, false)}>-Remove</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (selectedProductKey && !selectedProduct) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/admin/kitchen/stock')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stock Cards
        </Button>
        <Card className="text-center py-16">
          <CardContent>
            <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">Product not found</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5" />
          Store Stock Management
        </h2>
        <Button variant="outline" size="sm" onClick={loadProducts}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {STORE_CATEGORIES.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? 'default' : 'outline'}
            onClick={() => handleCategoryChange(category.id)}
            className={activeCategory === category.id
              ? 'bg-coffee-600 hover:bg-coffee-700 text-white rounded-full px-6'
              : 'border-coffee-300 text-coffee-700 hover:bg-coffee-50 rounded-full px-6'}
          >
            {category.label}
          </Button>
        ))}
      </div>

      <div className="flex justify-between items-center gap-3">
        <h3 className="font-playfair text-3xl font-bold text-coffee-900">
          {activeCategoryConfig.label} Cards
        </h3>
        <span className="text-sm text-muted-foreground">{filtered.length} cards</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
        {filtered.map((product) => (
          <Card
            key={product.id}
            className="border-coffee-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group flex flex-col relative cursor-pointer"
            onClick={() => openProduct(product)}
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-coffee-50 to-cream-100 aspect-[4/3]">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.product_name}
                  loading="lazy"
                  decoding="async"
                  className="store-img is-loaded w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
              {product.badge && (
                <Badge className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-coffee-600 text-white border-0 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2.5 sm:py-1">
                  {product.badge}
                </Badge>
              )}
              {product.coming_soon && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="bg-coffee-900/80 text-white font-playfair font-bold text-sm sm:text-xl px-3 py-1.5 sm:px-5 sm:py-2 rounded-full shadow-2xl rotate-[-8deg] border-2 border-cream-100">
                    Coming Soon
                  </div>
                </div>
              )}
            </div>

            <CardHeader className="p-3 sm:p-5 pb-2">
              <div className="hidden sm:flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  {[...Array(Math.max(1, product.rating ?? 5))].slice(0, 5).map((_, index) => (
                    <Star key={index} className="w-3.5 h-3.5 fill-coffee-500 text-coffee-500" />
                  ))}
                </div>
                {product.origin && <span className="text-xs text-coffee-600 truncate max-w-24">{product.origin}</span>}
              </div>
              <CardTitle className="text-sm sm:text-xl text-coffee-900 font-playfair leading-tight line-clamp-2">
                {product.product_name}
              </CardTitle>
              <CardDescription className="hidden sm:block text-coffee-700 line-clamp-2 text-xs sm:text-sm leading-snug mt-1">
                {product.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3 sm:p-5 pt-0 mt-auto space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm sm:text-2xl font-bold text-coffee-600 whitespace-nowrap">AED {product.price}</span>
                <span className="hidden sm:inline text-sm text-coffee-600 truncate">{product.volume}</span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5">
                <span className="text-xs text-muted-foreground">Stock</span>
                <span className={`text-lg font-bold ${stockToneClass(product.stock_quantity)}`}>{product.stock_quantity}</span>
              </div>
            </CardContent>

            <CardFooter className="p-3 sm:p-5 pt-0">
              <Button className="w-full bg-coffee-600/60 text-white rounded-full text-xs sm:text-sm h-9 cursor-pointer">
                Open & Edit
              </Button>
            </CardFooter>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="text-center py-16 col-span-full">
            <CardContent>
              <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No products in this category yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
