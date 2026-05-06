import { useState, useEffect, useLayoutEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, Award, Package } from 'lucide-react';
import StoreProductCard from '@/components/StoreProductCard';
import { supabase } from '@/integrations/supabase/client';
import { STORE_CATEGORIES, type StoreCategory, type StoreProduct } from '@/data/storeCatalog';

const CATEGORY_KEY = 'store:activeCategory';
const SCROLL_KEY = 'store:scrollY';
const PENDING_SCROLL_KEY = 'store:pendingScrollY';
const GLOBAL_STORE_SCROLL_KEY = 'scroll-pos:/store';

const StorePage = () => {
  const [activeCategory, setActiveCategoryState] = useState<StoreCategory>(() => {
    const saved = sessionStorage.getItem(CATEGORY_KEY) as StoreCategory | null;
    return saved && STORE_CATEGORIES.some(c => c.id === saved) ? saved : 'oil';
  });
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  const [loaded, setLoaded] = useState(false);
  const activeCategoryConfig = STORE_CATEGORIES.find((c) => c.id === activeCategory) ?? STORE_CATEGORIES[0];
  const filteredProducts = products.filter((product) => product.category === activeCategory);

  const setActiveCategory = (cat: StoreCategory) => {
    sessionStorage.setItem(CATEGORY_KEY, cat);
    sessionStorage.removeItem(SCROLL_KEY);
    setActiveCategoryState(cat);
  };

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase
        .from('store_products')
        .select('*')
        .order('sort_order', { ascending: true });
      if (data) {
        const stock: Record<number, number> = {};
        const list: StoreProduct[] = (data as any[]).map(row => {
          stock[row.product_key] = row.stock_quantity;
          return {
            id: row.product_key,
            name: row.product_name,
            description: row.description ?? '',
            price: Number(row.price ?? 0),
            image: row.image_url ?? '',
            rating: row.rating ?? 5,
            badge: row.badge ?? '',
            volume: row.volume ?? '',
            origin: row.origin ?? '',
            category: (row.category ?? 'oil') as StoreCategory,
            comingSoon: !!row.coming_soon,
          };
        });
        setProducts(list);
        setStockMap(stock);
      }
      setLoaded(true);
    };
    loadProducts();
  }, []);

  // Disable browser auto scroll restoration on this page
  useEffect(() => {
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const save = () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    window.addEventListener('beforeunload', save);
    window.addEventListener('pagehide', save);
    return () => {
      save();
      window.removeEventListener('beforeunload', save);
      window.removeEventListener('pagehide', save);
      window.history.scrollRestoration = prev;
    };
  }, []);

  // Restore scroll after products load AND first images settle (prevents jump glitch)
  useLayoutEffect(() => {
    if (!loaded) return;
    const y = sessionStorage.getItem(PENDING_SCROLL_KEY) ?? sessionStorage.getItem(SCROLL_KEY) ?? sessionStorage.getItem(GLOBAL_STORE_SCROLL_KEY);
    if (!y) return;
    const targetY = parseInt(y, 10);
    let cancelled = false;
    let attempts = 0;

    const doScroll = () => {
      if (cancelled) return;
      window.scrollTo(0, targetY);
      attempts += 1;
      if (attempts < 30 && Math.abs(window.scrollY - targetY) > 8) {
        requestAnimationFrame(doScroll);
      } else {
        sessionStorage.setItem(SCROLL_KEY, String(targetY));
        sessionStorage.setItem(GLOBAL_STORE_SCROLL_KEY, String(targetY));
        sessionStorage.removeItem(PENDING_SCROLL_KEY);
      }
    };

    // Wait until all currently-rendered store images have decoded (or timeout)
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.store-img'));
    const decodes = imgs.map(img =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : img.decode().catch(() => {})
    );
    const timeout = new Promise(resolve => setTimeout(resolve, 500));
    Promise.race([Promise.all(decodes), timeout]).then(() => {
      requestAnimationFrame(doScroll);
    });
    // Initial best-effort scroll to minimize visual gap
    requestAnimationFrame(doScroll);
    return () => { cancelled = true; };
  }, [loaded]);

  const features = [
    { icon: Leaf, title: '100% Natural', description: 'No additives or preservatives' },
    { icon: Award, title: 'Award Winning', description: 'Internationally recognized quality' },
    { icon: Package, title: 'Direct Import', description: 'From farm to your table' },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-coffee-50 via-cream-50 to-background">
        <div className="container mx-auto text-center">
          <h1 className="font-playfair text-5xl md:text-6xl font-bold text-coffee-900 mb-6 animate-fade-in">
            {activeCategoryConfig.heroTitle}
          </h1>
          <p className="text-xl text-coffee-700 max-w-3xl mx-auto mb-8 animate-fade-in">
            {activeCategoryConfig.heroDescription}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {STORE_CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'outline'}
                onClick={() => setActiveCategory(category.id)}
                className={activeCategory === category.id ? 'bg-coffee-600 hover:bg-coffee-700 text-white rounded-full px-6' : 'border-coffee-300 text-coffee-700 hover:bg-coffee-50 rounded-full px-6'}
              >
                {category.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-12">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 animate-scale-in">
                <div className="w-12 h-12 bg-coffee-100 rounded-full flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-coffee-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-coffee-900">{feature.title}</div>
                  <div className="text-sm text-coffee-600">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-0 sm:px-6 lg:px-8">
        <div className="w-full sm:container sm:mx-auto">
          <div className="flex justify-between items-center mb-12 px-4 sm:px-0">
            <h2 className="font-playfair text-4xl font-bold text-coffee-900">
              {activeCategoryConfig.label} Selection
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-1 sm:gap-3 md:gap-6">
            {filteredProducts.map((product) => (
              <StoreProductCard
                key={product.id}
                product={product}
                stock={stockMap[product.id] ?? null}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-coffee-100 via-cream-50 to-coffee-50">
        <div className="container mx-auto">
          <h2 className="font-playfair text-4xl font-bold text-coffee-900 text-center mb-12">
            Why Choose Our {activeCategoryConfig.label}?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'First Cold Press', description: 'Extracted at optimal temperature to preserve nutrients and flavor' },
              { title: 'Lab Tested', description: 'Each batch is tested for purity and quality standards' },
              { title: 'Sustainably Sourced', description: 'Supporting small family farms and sustainable practices' },
              { title: 'Fresh Harvest', description: 'Bottled within days of harvest for maximum freshness' },
            ].map((benefit, index) => (
              <Card key={index} className="text-center border-coffee-200 hover:border-coffee-400 transition-all duration-300">
                <CardHeader>
                  <div className="w-16 h-16 bg-coffee-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-white font-bold">{index + 1}</span>
                  </div>
                  <CardTitle className="text-xl text-coffee-900">{benefit.title}</CardTitle>
                  <CardDescription className="text-coffee-700">{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-coffee-800 via-coffee-700 to-coffee-800 text-white">
        <div className="container mx-auto text-center">
          <h2 className="font-playfair text-4xl md:text-5xl font-bold mb-6">
            Discover More from Nawa
          </h2>
          <p className="text-xl text-cream-100 mb-8 max-w-2xl mx-auto">
            Explore curated pantry essentials and seasonal additions across oil, honey, and coffee beans.
          </p>
          <div className="flex justify-center">
            <Button
              size="lg"
              className="bg-white text-coffee-700 hover:bg-cream-50 rounded-full px-8"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Buy Now
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default StorePage;
