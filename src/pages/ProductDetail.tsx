import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { getStoreProductById } from '@/data/storeCatalog';

const ProductDetail = () => {

  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [stock, setStock] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('store_products')
      .select('stock_quantity')
      .eq('product_key', Number(id))
      .maybeSingle()
      .then(({ data }) => {
        setStock(data?.stock_quantity ?? null);
      });
  }, [id]);

  const product = getStoreProductById(Number(id));

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/store', { replace: true });
  }, [navigate]);

  if (!product) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Product not found</h1>
            <Button onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Store
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart({
      id: product.id + 10000,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      category: product.category
    });
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Store
          </Button>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Image */}
            <div className="relative overflow-hidden rounded-lg aspect-square bg-gradient-to-br from-coffee-50 to-cream-100">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <Badge className="absolute top-4 right-4 bg-coffee-600 text-white border-0 text-base px-4 py-2">
                {product.badge}
              </Badge>
            </div>

            {/* Details */}
            <div className="flex flex-col justify-center space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {[...Array(product.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-coffee-500 text-coffee-500" />
                  ))}
                  <span className="text-coffee-600 ml-2">({product.rating}.0)</span>
                </div>
                
                <h1 className="font-playfair text-4xl md:text-5xl font-bold text-coffee-900 mb-4">
                  {product.name}
                </h1>
                
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-sm text-coffee-600 bg-coffee-50 px-3 py-1 rounded-full">
                    Origin: {product.origin}
                  </span>
                  <span className="text-sm text-coffee-600 bg-coffee-50 px-3 py-1 rounded-full">
                    {product.volume}
                  </span>
                </div>

                <p className="text-lg text-coffee-700 mb-8 leading-relaxed">
                  {product.description}
                </p>
                
                <div className="text-4xl font-bold text-coffee-600 mb-4">
                  AED {product.price}
                </div>
                {stock !== null && (
                  <div className={`text-lg font-semibold mb-8 ${stock === 0 ? 'text-red-600' : stock < 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {stock === 0 ? '● Out of Stock' : `● ${stock} in stock`}
                  </div>
                )}
                {stock === null && <div className="mb-8" />}
              </div>

              <div className="space-y-4">
                <Button 
                  size="lg" 
                  className="w-full bg-coffee-600/60 text-white rounded-full text-lg py-6 cursor-not-allowed"
                  disabled
                >
                  Coming Soon
                </Button>
                
                <div className="border-t border-coffee-200 pt-6">
                  <h3 className="font-semibold text-coffee-900 mb-3">Product Features:</h3>
                  <ul className="space-y-2 text-coffee-700">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-coffee-600 rounded-full"></span>
                      100% Natural - No additives
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-coffee-600 rounded-full"></span>
                      Cold-pressed for quality
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-coffee-600 rounded-full"></span>
                      Direct from Mediterranean estates
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-coffee-600 rounded-full"></span>
                      Lab tested for purity
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;
