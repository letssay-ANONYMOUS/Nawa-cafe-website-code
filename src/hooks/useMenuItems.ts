import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MenuItem {
  id: string;
  card_number: number;
  display_order: number;
  title: string;
  description: string | null;
  price: number;
  category: string;
  subcategory: string | null;
  image_url: string | null;
  options: any | null;
  tags: string[] | null;
  published: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  image: string;
}

export interface GroupedMenuData {
  [categoryId: string]: MenuItem[];
}

// Category configuration for display
export const menuCategories: MenuCategory[] = [
  { id: 'nawa-breakfast', name: 'NAWA Breakfast', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=300&q=80' },
  { id: 'coffee', name: 'COFFEE', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=300&q=80' },
  { id: 'cold-beverages', name: 'Cold Beverages', image: '/menu-images/cold-coffee-1.jpg' },
  { id: 'manual-brew', name: 'MANUAL BREW', image: '/menu-images/manual-brew-1.jpg' },
  { id: 'lunch-dinner', name: 'Lunch & Dinner', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80' },
  { id: 'appetisers', name: 'Appetisers', image: '/menu-images/appetiser-1.jpg' },
  { id: 'pasta', name: 'Pasta', image: '/menu-images/pasta-1.jpg' },
  { id: 'risotto', name: 'RISOTTO', image: '/menu-images/risotto-1.jpg' },
  { id: 'spanish-dishes', name: 'Spanish Dishes', image: '/menu-images/spanish-1.jpg' },
  { id: 'burgers', name: 'Burgers', image: '/menu-images/burger-1.jpg' },
  { id: 'sharing-meal', name: 'SERVE SHARE & EAT - SHARING MEAL MEAN SHARING LOVE', image: '/menu-images/sharing-meal-1.jpg' },
  { id: 'fries', name: 'Fries', image: '/menu-images/fries-1.jpg' },
  { id: 'club-sandwich', name: 'EATING HEALTHY TO LOSE WEIGHT CLUB SANDWICH', image: '/menu-images/club-sandwich-1.jpg' },
  { id: 'kids-meals', name: 'Kids Meals', image: '/menu-images/kids-meal-1.jpg' },
  { id: 'pastries', name: 'Pastries & Desserts', image: '/menu-images/dessert-1.jpg' },
  { id: 'mojito', name: 'Mojito', image: '/menu-images/mojito-1.jpg' },
  { id: 'water', name: 'Water', image: '/menu-images/water-1.jpg' },
  { id: 'infusion', name: 'Infusion', image: '/menu-images/infusion-1.jpg' },
  { id: 'fresh-juice', name: 'Fresh Juice', image: '/menu-images/fresh-juice-1.jpg' },
  { id: 'matcha', name: '🍃💚💚 MATCHA LOVERS OFFERS 🍃💚', image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=300&q=80' },
  { id: 'nawa-special-tea', name: 'NAWA SPECIAL TEA', image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=300&q=80' },
  { id: 'arabic-coffee', name: 'ARABIC COFFEE', image: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?auto=format&fit=crop&w=300&q=80' },
  { id: 'nawa-summer', name: 'NAWA SUMMER', image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=300&q=80' },
];

async function fetchMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('published', true)
    .order('card_number', { ascending: true });

  if (error) {
    console.error('Error fetching menu items:', error);
    throw error;
  }

  return (data || []).map(item => ({
    id: item.id,
    card_number: (item as any).card_number || 0,
    display_order: (item as any).display_order || 0,
    title: item.title,
    description: item.description,
    price: Number(item.price),
    category: item.category,
    subcategory: (item as any).subcategory || null,
    image_url: item.image_url,
    options: (item as any).options || null,
    tags: item.tags,
    published: item.published,
  }));
}

export function useMenuItems() {
  return useQuery({
    queryKey: ['menu-items'],
    queryFn: fetchMenuItems,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
  });
}

// Group items by category, flat array sorted by card_number
export function groupMenuItems(items: MenuItem[]): GroupedMenuData {
  const grouped: GroupedMenuData = {};

  for (const item of items) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  }

  // Sort each category by card_number
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => a.card_number - b.card_number);
  }

  return grouped;
}

// Convert DB item to legacy format for MenuCard compatibility
export function toMenuCardItem(item: MenuItem) {
  return {
    id: item.card_number || parseInt(item.id.slice(0, 8), 16) % 1000,
    name: item.title,
    description: item.description || '',
    price: item.price,
    image: item.image_url || '/placeholder.svg',
    options: item.options,
  };
}
