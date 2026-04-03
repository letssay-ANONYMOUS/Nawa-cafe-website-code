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

const ProductDetail = () => {

  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const products = [
    {
      id: 1,
      name: "Premium Extra Virgin Olive Oil",
      description: "Cold-pressed from hand-picked olives in the Mediterranean. Rich, fruity flavor with peppery finish. Perfect for drizzling over salads, pasta, or bread. This premium oil is extracted using traditional methods that preserve all the natural antioxidants and polyphenols.",
      price: 312,
      image: "/olive-oils/premium-evoo.jpg",
      rating: 5,
      badge: "Bestseller",
      volume: "500ml",
      origin: "Italy"
    },
    {
      id: 2,
      name: "Organic Single Estate Olive Oil",
      description: "Certified organic, single-origin olive oil with delicate notes of grass and artichoke. Sourced from a family-owned estate in Spain with over 200 years of olive cultivation tradition.",
      price: 349,
      image: "/olive-oils/organic-estate.jpg",
      rating: 5,
      badge: "Organic",
      volume: "750ml",
      origin: "Spain"
    },
    {
      id: 3,
      name: "Infused Garlic & Herb Olive Oil",
      description: "Premium olive oil infused with fresh garlic, rosemary, and Mediterranean herbs. Perfect for marinades, roasting vegetables, or as a finishing oil for grilled meats.",
      price: 275,
      image: "/olive-oils/garlic-herb.jpg",
      rating: 4,
      badge: "Limited",
      volume: "250ml",
      origin: "Greece"
    },
    {
      id: 4,
      name: "Early Harvest Olive Oil",
      description: "Made from green, early-harvest olives for intense flavor and maximum health benefits. Higher in polyphenols and antioxidants with a robust, peppery finish.",
      price: 386,
      image: "/olive-oils/early-harvest.jpg",
      rating: 5,
      badge: "Premium",
      volume: "500ml",
      origin: "Italy"
    },
    {
      id: 5,
      name: "Lemon Infused Olive Oil",
      description: "Bright and zesty olive oil infused with fresh Mediterranean lemons. Perfect for salads, seafood, grilled chicken, and adding a citrus twist to your favorite dishes.",
      price: 257,
      image: "/olive-oils/lemon-infused.jpg",
      rating: 5,
      badge: "New",
      volume: "250ml",
      origin: "Greece"
    },
    {
      id: 6,
      name: "Gift Set Collection",
      description: "Curated selection of three premium olive oils in an elegant gift box. Includes our Premium EVOO, Garlic & Herb, and Lemon Infused varieties. Perfect for the olive oil enthusiast.",
      price: 661,
      image: "/olive-oils/gift-set.jpg",
      rating: 5,
      badge: "Gift Set",
      volume: "3x250ml",
      origin: "Mixed"
    }
  ];

  const product = products.find(p => p.id === Number(id));

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
      category: 'Olive Oil'
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
                
                <div className="text-4xl font-bold text-coffee-600 mb-8">
                  AED {product.price}
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  size="lg" 
                  className="w-full bg-coffee-600 hover:bg-coffee-700 text-white rounded-full text-lg py-6"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
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
