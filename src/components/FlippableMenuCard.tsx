import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Coffee, RotateCcw } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

interface FlippableMenuCardProps {
  item: {
    id: number;
    name: string;
    description: string;
    price: number;
    image: string;
    options?: any;
  };
  cardNumber?: number;
  category?: string;
}

// Sample beverages to show on card back
const BEVERAGES = [
  { name: 'Espresso', price: 12 },
  { name: 'Cappuccino', price: 18 },
  { name: 'Latte', price: 20 },
];

const FlippableMenuCard = ({ item, cardNumber, category = 'menu' }: FlippableMenuCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: category,
    });
    toast({
      title: 'Added to cart',
      description: `${item.name} has been added to your cart.`,
    });
  };

  const handleAddBeverage = (e: React.MouseEvent, beverage: { name: string; price: number }) => {
    e.stopPropagation();
    addToCart({
      id: Math.random() * 10000, // Temp ID for beverage
      name: beverage.name,
      description: `Fresh ${beverage.name}`,
      price: beverage.price,
      image: '/menu-images/coffee-1.jpg',
      category: 'coffee',
    });
    toast({
      title: 'Added to cart',
      description: `${beverage.name} has been added to your cart.`,
    });
  };

  return (
    <div 
      className="relative w-full aspect-[4/3] cursor-pointer group"
      style={{ perspective: '1000px' }}
      onClick={handleFlip}
    >
      <div
        className={`relative w-full h-full transition-transform duration-700 ease-in-out`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front of Card */}
        <Card
          className="absolute inset-0 overflow-hidden border-0 shadow-lg bg-transparent"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="relative w-full h-full">
            <img
              src={item.image}
              alt={item.name}
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
            
            {/* Card Number Badge */}
            {cardNumber && (
              <div className="absolute top-2 left-2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg z-10">
                <span className="text-white font-bold text-lg">{cardNumber}</span>
              </div>
            )}

            {/* Flip indicator */}
            <div className="absolute top-2 right-2 w-8 h-8 bg-[#c9a962]/90 rounded-full flex items-center justify-center shadow-lg">
              <RotateCcw className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Golden Footer */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#c9a962]/90 backdrop-blur-sm p-3">
            <h3 className="font-semibold text-white text-sm md:text-base leading-tight mb-1">
              {item.name}
            </h3>
            <div className="flex items-center justify-between">
              <p className="text-white/90 font-bold text-base md:text-lg">
                AED {item.price.toFixed(2)}
              </p>
              <p className="text-white/60 text-xs">
                Tap to flip
              </p>
            </div>
          </div>
        </Card>

        {/* Back of Card */}
        <Card
          className="absolute inset-0 overflow-hidden border-0 shadow-lg bg-[#4a5f4a]"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="w-full h-full flex flex-col p-3 md:p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[#c9a962] text-sm md:text-base leading-tight line-clamp-1">
                {item.name}
              </h3>
              <button 
                onClick={(e) => { e.stopPropagation(); handleFlip(); }}
                className="w-6 h-6 bg-[#c9a962]/20 rounded-full flex items-center justify-center hover:bg-[#c9a962]/40 transition-colors"
              >
                <RotateCcw className="w-3 h-3 text-[#c9a962]" />
              </button>
            </div>

            {/* Description */}
            <p className="text-white/80 text-xs md:text-sm leading-relaxed mb-3 line-clamp-3 flex-shrink-0">
              {item.description || 'A delicious item from our carefully crafted menu.'}
            </p>

            {/* Price & Add to Cart */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <span className="text-[#c9a962] font-bold text-lg">
                AED {item.price.toFixed(2)}
              </span>
              <Button
                size="sm"
                onClick={handleAddToCart}
                className="bg-[#c9a962] hover:bg-[#b8984f] text-white text-xs px-3 py-1 h-8"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add to Cart
              </Button>
            </div>

            {/* Beverages Section */}
            <div className="flex-1 min-h-0">
              <div className="flex items-center gap-1 mb-2">
                <Coffee className="w-3 h-3 text-[#c9a962]" />
                <span className="text-[#c9a962] text-xs font-semibold">Add a Beverage</span>
              </div>
              <div className="space-y-1.5">
                {BEVERAGES.map((beverage) => (
                  <div
                    key={beverage.name}
                    className="flex items-center justify-between bg-white/10 rounded px-2 py-1.5"
                  >
                    <span className="text-white text-xs">{beverage.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/70 text-xs">AED {beverage.price}</span>
                      <button
                        onClick={(e) => handleAddBeverage(e, beverage)}
                        className="w-5 h-5 bg-[#c9a962] rounded-full flex items-center justify-center hover:bg-[#b8984f] transition-colors"
                      >
                        <Plus className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FlippableMenuCard;
