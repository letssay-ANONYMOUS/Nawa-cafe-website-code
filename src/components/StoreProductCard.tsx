import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Star, Edit, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  rating: number;
  badge: string;
  volume: string;
  origin: string;
}

interface StoreProductCardProps {
  product: Product;
  stock?: number | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

const StoreProductCard = ({ product, onEdit, onDelete }: StoreProductCardProps) => {
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
      category: 'Olive Oil'
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
      className="border-coffee-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden group cursor-pointer"
      onClick={() => navigate(`/store/${product.id}`)}
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-coffee-50 to-cream-100 h-64">
        <img 
          src={product.image} 
          alt={product.name}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <Badge className="absolute top-4 right-4 bg-coffee-600 text-white border-0">
          {product.badge}
        </Badge>
        {isAdmin && (
          <div className="absolute top-4 left-4 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-white/90 hover:bg-white"
              onClick={handleEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              onClick={handleDelete}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            {[...Array(product.rating)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-coffee-500 text-coffee-500" />
            ))}
          </div>
          <span className="text-sm text-coffee-600">{product.origin}</span>
        </div>
        <CardTitle className="text-xl text-coffee-900 font-playfair">{product.name}</CardTitle>
        <CardDescription className="text-coffee-700 line-clamp-2">{product.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-coffee-600">AED {product.price}</span>
          <span className="text-coffee-600">{product.volume}</span>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button 
          className="flex-1 bg-coffee-600 hover:bg-coffee-700 text-white rounded-full"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to Cart
        </Button>
        <Button 
          variant="outline" 
          className="border-coffee-600 text-coffee-600 hover:bg-coffee-50 rounded-full"
          onClick={handleViewDetails}
        >
          Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default StoreProductCard;
