import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, Award, Package, Plus } from 'lucide-react';
import StoreProductCard from '@/components/StoreProductCard';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminCardModal } from '@/components/AdminCardModal';
import { AdminDeleteConfirm } from '@/components/AdminDeleteConfirm';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { STORE_CATEGORIES, STORE_PRODUCTS, type StoreCategory, type StoreProduct } from '@/data/storeCatalog';

const StorePage = () => {

  const { isAdmin, addPendingChange } = useAdmin();
  const { toast } = useToast();
  const [showCardModal, setShowCardModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCard, setEditingCard] = useState<StoreProduct | null>(null);
  const [deletingCard, setDeletingCard] = useState<StoreProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState<StoreCategory>('oil');
  const [products, setProducts] = useState<StoreProduct[]>(STORE_PRODUCTS);
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  const activeCategoryConfig = STORE_CATEGORIES.find((category) => category.id === activeCategory) ?? STORE_CATEGORIES[0];
  const filteredProducts = products.filter((product) => product.category === activeCategory);

  useEffect(() => {
    const loadStock = async () => {
      const { data } = await supabase
        .from('store_products')
        .select('product_key, stock_quantity');
      if (data) {
        const map: Record<number, number> = {};
        (data as unknown as { product_key: number; stock_quantity: number }[]).forEach(p => {
          map[p.product_key] = p.stock_quantity;
        });
        setStockMap(map);
      }
    };
    loadStock();
  }, []);

  const handleAddNew = () => {
    setEditingCard(null);
    setShowCardModal(true);
  };

  const handleEdit = (product: StoreProduct) => {
    setEditingCard(product);
    setShowCardModal(true);
  };

  const handleDelete = (product: StoreProduct) => {
    setDeletingCard(product);
    setShowDeleteConfirm(true);
  };

  const handleSave = (data: any) => {
    addPendingChange({
      type: editingCard ? 'edit' : 'add',
      page: 'store',
      data,
      id: editingCard?.id
    });
    
    if (editingCard) {
      setProducts(products.map(p => p.id === editingCard.id ? { ...p, ...data } : p));
    } else {
      const newId = Math.max(...products.map(p => p.id)) + 1;
      setProducts([...products, { 
        id: newId, 
        ...data, 
        rating: 5, 
        badge: 'New', 
        volume: '500ml', 
        origin: 'Mediterranean',
        category: activeCategory,
      }]);
    }
  };

  const confirmDelete = () => {
    addPendingChange({
      type: 'delete',
      page: 'store',
      id: deletingCard.id
    });
    
    setProducts(products.filter(p => p.id !== deletingCard.id));
    setShowDeleteConfirm(false);
    toast({
      title: 'Changes staged',
      description: 'Card deletion staged. Click Save in footer to apply.',
    });
  };

  const features = [
    {
      icon: Leaf,
      title: "100% Natural",
      description: "No additives or preservatives"
    },
    {
      icon: Award,
      title: "Award Winning",
      description: "Internationally recognized quality"
    },
    {
      icon: Package,
      title: "Direct Import",
      description: "From farm to your table"
    }
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
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
          
          {/* Feature Badges */}
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

      {/* Products Section */}
      <section className="py-16 px-0 sm:px-6 lg:px-8">
        <div className="w-full sm:container sm:mx-auto">
          <div className="flex justify-between items-center mb-12 px-4 sm:px-0">
            <h2 className="font-playfair text-4xl font-bold text-coffee-900">
              {activeCategoryConfig.label} Selection
            </h2>
            {isAdmin && (
              <Button
                onClick={handleAddNew}
                className="bg-coffee-600 hover:bg-coffee-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Card
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-1 sm:gap-3 md:gap-6">
            {filteredProducts.map((product) => (
              <StoreProductCard 
                key={product.id} 
                product={product}
                stock={stockMap[product.id] ?? null}
                {...(isAdmin ? {
                  onEdit: () => handleEdit(product),
                  onDelete: () => handleDelete(product)
                } : {})}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-coffee-100 via-cream-50 to-coffee-50">
        <div className="container mx-auto">
          <h2 className="font-playfair text-4xl font-bold text-coffee-900 text-center mb-12">
            Why Choose Our {activeCategoryConfig.label}?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "First Cold Press",
                description: "Extracted at optimal temperature to preserve nutrients and flavor"
              },
              {
                title: "Lab Tested",
                description: "Each batch is tested for purity and quality standards"
              },
              {
                title: "Sustainably Sourced",
                description: "Supporting small family farms and sustainable practices"
              },
              {
                title: "Fresh Harvest",
                description: "Bottled within days of harvest for maximum freshness"
              }
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

      {/* CTA Section */}
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
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Buy Now
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      <AdminCardModal
        open={showCardModal}
        onOpenChange={setShowCardModal}
        onSave={handleSave}
        initialData={editingCard}
        title={editingCard ? 'Edit Card' : 'Add New Card'}
        page="store"
      />

      <AdminDeleteConfirm
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={confirmDelete}
        itemName={deletingCard?.name || ''}
      />
    </div>
  );
};

export default StorePage;