import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useMenuItems, toMenuCardItem } from '@/hooks/useMenuItems';
import { Skeleton } from '@/components/ui/skeleton';

interface OptionChoice {
  name: string;
  price: number;
}

interface OptionGroup {
  groupName: string;
  selectHint: string;
  maxSelect: number;
  required: boolean;
  choices: OptionChoice[];
}

const MenuItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});

  // Fetch menu items from backend
  const { data: menuItems, isLoading, error } = useMenuItems();

  const handleBack = useCallback(() => {
    navigate('/menu');
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack]);

  // Find item by card_number (id in URL)
  const menuItem = menuItems?.find(item => item.card_number === Number(id));
  const item = menuItem ? toMenuCardItem(menuItem) : null;

  const handleOptionSelect = (groupName: string, choiceName: string, maxSelect: number) => {
    setSelectedOptions(prev => {
      const current = prev[groupName] || [];
      const isSelected = current.includes(choiceName);
      
      if (isSelected) {
        return { ...prev, [groupName]: current.filter(c => c !== choiceName) };
      } else {
        if (maxSelect === 1) {
          return { ...prev, [groupName]: [choiceName] };
        } else if (current.length < maxSelect) {
          return { ...prev, [groupName]: [...current, choiceName] };
        }
        return prev;
      }
    });
  };

  const calculateTotalPrice = () => {
    if (!item) return 0;
    let total = item.price;
    
    const options = item.options as OptionGroup[] | undefined;
    if (options) {
      options.forEach(group => {
        const selected = selectedOptions[group.groupName] || [];
        selected.forEach(choiceName => {
          const choice = group.choices.find(c => c.name === choiceName);
          if (choice) total += choice.price;
        });
      });
    }
    
    return total;
  };

  const isValidSelection = () => {
    const options = item?.options as OptionGroup[] | undefined;
    if (!options) return true;
    
    return options.every(group => {
      if (!group.required) return true;
      const selected = selectedOptions[group.groupName] || [];
      return selected.length > 0;
    });
  };

  const handleAddToCart = () => {
    if (!item) return;
    
    if (!isValidSelection()) {
      toast({
        title: 'Selection required',
        description: 'Please select required options before adding to cart.',
        variant: 'destructive',
      });
      return;
    }
    
    const selectedOptionsText = Object.entries(selectedOptions)
      .filter(([_, choices]) => choices.length > 0)
      .map(([group, choices]) => `${group}: ${choices.join(', ')}`)
      .join(' | ');
    
    addToCart({
      id: item.id,
      name: item.name,
      description: selectedOptionsText || item.description,
      price: calculateTotalPrice(),
      image: item.image,
      category: 'menu'
    });
    toast({
      title: 'Added to cart',
      description: `${item.name} has been added to your cart.`,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-10 w-32 mb-6" />
            <div className="grid md:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error or not found
  if (error || !item) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Item not found</h1>
            <Button onClick={() => navigate('/menu')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Menu
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const options = item.options as OptionGroup[] | undefined;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Menu
          </Button>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Image */}
            <div className="relative overflow-hidden rounded-lg aspect-square">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="flex flex-col justify-start space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-4">{item.name}</h1>
                <p className="text-lg text-muted-foreground mb-6">
                  {item.description}
                </p>
                <div className="text-3xl font-bold text-[#c9a962]">
                  AED {calculateTotalPrice().toFixed(2)}
                </div>
              </div>

              {/* Options */}
              {options && options.map((group, groupIndex) => (
                <div key={groupIndex} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{group.groupName}</h3>
                      <p className="text-sm text-muted-foreground">{group.selectHint}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-[#c9a962] text-white text-xs rounded font-medium">
                        {group.maxSelect} Max
                      </span>
                      {group.required && (
                        <span className="px-2 py-1 bg-[#c9a962] text-white text-xs rounded font-medium">
                          1 Required
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    {group.choices.map((choice, choiceIndex) => {
                      const isSelected = (selectedOptions[group.groupName] || []).includes(choice.name);
                      return (
                        <div
                          key={choiceIndex}
                          onClick={() => handleOptionSelect(group.groupName, choice.name, group.maxSelect)}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-[#c9a962]/10 border-2 border-[#c9a962]' 
                              : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-[#c9a962] bg-[#c9a962]' : 'border-muted-foreground'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="font-medium">{choice.name}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {choice.price > 0 ? `+ AED ${choice.price.toFixed(2)}` : `AED ${choice.price.toFixed(2)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="space-y-4">
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MenuItemDetail;
