import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MenuCard {
  id: number;
  name: string | null;
  price: string | null;
  description: string | null;
  image_url: string | null;
}

// Section definitions based on card ID ranges
export interface MenuSection {
  id: string;
  name: string;
  startId: number;
  endId: number;
  cardIds?: number[];
}

export const menuSections: MenuSection[] = [
  { id: 'nawa-breakfast', name: 'NAWA Breakfast', startId: 1, endId: 19 },
  { id: 'coffee', name: 'COFFEE', startId: 24, endId: 42 },
  { id: 'cold-beverages', name: 'Cold Beverages', startId: 43, endId: 58 },
  { id: 'manual-brew', name: 'MANUAL BREW', startId: 59, endId: 173, cardIds: [59, 60, 61, 62, 63, 170, 171, 172, 173] },
  { id: 'lunch-dinner', name: 'Lunch & Dinner', startId: 64, endId: 66 },
  { id: 'appetisers', name: 'Appetisers', startId: 67, endId: 73 },
  { id: 'pasta', name: 'Pasta', startId: 74, endId: 76 },
  { id: 'risotto', name: 'RISOTTO', startId: 77, endId: 81 },
  { id: 'spanish-dishes', name: 'Spanish Dishes', startId: 82, endId: 83 },
  { id: 'burgers', name: 'Burgers', startId: 84, endId: 91 },
  { id: 'fries', name: 'Fries', startId: 92, endId: 94 },
  { id: 'club-sandwich', name: 'Club Sandwich', startId: 95, endId: 95 },
  { id: 'kids-meals', name: 'Kids Meals', startId: 96, endId: 98 },
  { id: 'pastries-desserts', name: 'Pastries & Desserts', startId: 99, endId: 125 },
  { id: 'mojito', name: 'Mojito', startId: 126, endId: 130 },
  { id: 'water', name: 'Water', startId: 131, endId: 133 },
  { id: 'infusion', name: 'Infusion', startId: 134, endId: 135 },
  { id: 'fresh-juice', name: 'Fresh Juice', startId: 136, endId: 142 },
  { id: 'matcha', name: 'Matcha', startId: 143, endId: 150 },
  { id: 'nawa-special-tea', name: 'NAWA Special Tea', startId: 151, endId: 154 },
  { id: 'savoury', name: 'Savoury', startId: 155, endId: 157 },
  { id: 'croissants-bakery', name: 'Croissants & Bakery', startId: 158, endId: 169 },
];

async function fetchMenuCards(): Promise<MenuCard[]> {
  const { data, error } = await supabase
    .from('menu_cards')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching menu cards:', error);
    throw error;
  }

  return data || [];
}

export function useMenuCards() {
  return useQuery({
    queryKey: ['menu-cards'],
    queryFn: fetchMenuCards,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Group cards by section
export function groupCardsBySections(cards: MenuCard[]): Record<string, MenuCard[]> {
  const grouped: Record<string, MenuCard[]> = {};

  for (const section of menuSections) {
    grouped[section.id] = section.cardIds
      ? cards.filter((card) => section.cardIds?.includes(card.id))
      : cards.filter((card) => card.id >= section.startId && card.id <= section.endId);
  }

  return grouped;
}
