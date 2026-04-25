import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Star, Edit, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';
import type { StoreProduct } from '@/data/storeCatalog';

interface StoreProductCardProps {
  product: StoreProduct;
  stock?: number | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

const StoreProductCard = ({ product, stock, onEdit, onDelete }: StoreProductCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAdmin } = useAdmin();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/store/${product.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <Card 
      className="border-coffee-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden group flex flex-col relative"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-coffee-50 to-cream-100 aspect-[4/3] sm:h-64 sm:aspect-auto">
        <img 
          src={product.image} 
          alt={product.name}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover grayscale opacity-70"
        />
        <Badge className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-coffee-600 text-white border-0 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2.5 sm:py-1">
          {product.badge}
        </Badge>
        {isAdmin && onEdit && onDelete && (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex gap-1 sm:gap-2 z-20">
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7 sm:h-8 sm:w-8 bg-white/90 hover:bg-white"
              onClick={handleEdit}
            >
              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={handleDelete}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
        <div className="hidden sm:flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            {[...Array(product.rating)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-coffee-500 text-coffee-500" />
            ))}
          </div>
          <span className="text-sm text-coffee-600">{product.origin}</span>
        </div>
        <CardTitle className="text-sm sm:text-xl text-coffee-900 font-playfair leading-tight line-clamp-2">{product.name}</CardTitle>
        <CardDescription className="hidden sm:block text-coffee-700 line-clamp-2 text-[11px] sm:text-sm leading-snug mt-1">{product.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 mt-auto">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm sm:text-3xl font-bold text-coffee-600 whitespace-nowrap">AED {product.price}</span>
          <span className="hidden sm:inline text-coffee-600">{product.volume}</span>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 sm:p-6 pt-0 sm:pt-0 w-full">
        <Button 
          className="w-full bg-coffee-600/60 text-white rounded-full text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-4 cursor-not-allowed"
          disabled
        >
          <span className="truncate">Coming Soon</span>
        </Button>
      </CardFooter>

      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="bg-coffee-900/80 text-white font-playfair font-bold text-base sm:text-2xl px-4 py-2 sm:px-6 sm:py-3 rounded-full shadow-2xl rotate-[-8deg] border-2 border-cream-100">
          Coming Soon
        </div>
      </div>
    </Card>
  );
};

export default StoreProductCard;
