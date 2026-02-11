import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Edit, X } from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';
import { useAnalytics } from '@/hooks/useAnalytics';

interface MenuCardProps {
  item: {
    id: number;
    name: string;
    description: string;
    price: number;
    image: string;
  };
  cardNumber?: number;
  eagerLoad?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const MenuCard = ({ item, cardNumber, eagerLoad = false, onEdit, onDelete }: MenuCardProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { trackMenuItemView } = useAnalytics();

  const handleClick = () => {
    // Track menu item view
    trackMenuItemView(
      { itemId: String(item.id), itemName: item.name },
      'view'
    );
    
    // Save scroll position before navigating
    sessionStorage.setItem('menuScrollY', window.scrollY.toString());
    navigate(`/menu/${item.id}`);
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
      onClick={handleClick}
      className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-transparent cursor-pointer"
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={item.image}
          alt={item.name}
          loading={eagerLoad ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eagerLoad ? "high" : "auto"}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
        
        {/* Temporary Card Number */}
        {cardNumber && (
          <div className="absolute top-2 left-2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg z-10">
            <span className="text-white font-bold text-lg">{cardNumber}</span>
          </div>
        )}
        
        {/* Admin Controls */}
        {isAdmin && (
          <div className="absolute top-2 right-2 flex gap-2">
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

      {/* Golden Footer - fixed height for uniformity */}
      <div className="bg-[#c9a962]/90 backdrop-blur-sm p-3 min-h-[5.5rem] flex flex-col justify-between">
        <h3 className="font-semibold text-white text-xs sm:text-sm md:text-base leading-tight mb-1 line-clamp-2">
          {item.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <p className="text-white/90 font-bold text-sm sm:text-base md:text-lg">
            AED {item.price.toFixed(2)}
          </p>
          <p className="text-white/60 text-[10px] hidden md:block">
            Click for details
          </p>
        </div>
      </div>
    </Card>
  );
};

export default MenuCard;
