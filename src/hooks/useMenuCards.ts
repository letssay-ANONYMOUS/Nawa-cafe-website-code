import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MenuCard {
  id: number;
  name: string | null;
  price: string | null;
  description: string | null;
  image_url: string | null;
  section: string | null;
}

// Section definitions based on card ID ranges
export interface MenuSection {
  id: string;
  name: string;
  startId: number;
  endId: number;
  cardIds?: number[];
  imageUrl?: string | null;
  sortOrder?: number;
}

export const FALLBACK_MENU_SECTIONS: MenuSection[] = [
  { id: 'nawa-breakfast', name: 'NAWA Breakfast', startId: 1, endId: 19 },
  { id: 'coffee', name: 'COFFEE', startId: 24, endId: 42 },
  { id: 'cold-beverages', name: 'Cold Beverages', startId: 43, endId: 58, cardIds: [43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,119,120,121,122,123,124,125] },
  { id: 'manual-brew', name: 'MANUAL BREW', startId: 59, endId: 173, cardIds: [59, 60, 61, 62, 63, 170, 171, 172, 173] },
  { id: 'lunch-dinner', name: 'Lunch & Dinner', startId: 64, endId: 66 },
  { id: 'appetisers', name: 'Appetisers', startId: 67, endId: 73, cardIds: [67, 68, 69, 70, 71, 72, 73, 95] },
  { id: 'pasta', name: 'Pasta', startId: 74, endId: 76 },
  { id: 'risotto', name: 'RISOTTO', startId: 77, endId: 81 },
  { id: 'spanish-dishes', name: 'Spanish Dishes', startId: 82, endId: 83 },
  { id: 'burgers', name: 'Burgers', startId: 84, endId: 91 },
  { id: 'fries', name: 'Fries', startId: 92, endId: 94 },
  { id: 'kids-meals', name: 'Kids Meals', startId: 96, endId: 98 },
  { id: 'pastries-desserts', name: 'Pastries & Desserts', startId: 99, endId: 118, cardIds: [99,100,101,102,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118] },
  { id: 'mojito', name: 'Mojito', startId: 126, endId: 130 },
  { id: 'water', name: 'Water', startId: 131, endId: 133 },
  { id: 'infusion', name: 'Infusion', startId: 134, endId: 135 },
  { id: 'fresh-juice', name: 'Fresh Juice', startId: 136, endId: 142 },
  { id: 'matcha', name: 'Matcha', startId: 143, endId: 150 },
  { id: 'nawa-special-tea', name: 'NAWA Special Tea', startId: 151, endId: 154, cardIds: [151, 152, 153, 154, 103] },
  { id: 'savoury', name: 'Savoury', startId: 155, endId: 157 },
  { id: 'croissants-bakery', name: 'Croissants & Bakery', startId: 158, endId: 169 },
];

export const menuSections = FALLBACK_MENU_SECTIONS;

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

async function fetchMenuSections(): Promise<MenuSection[]> {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('id,name,image_url,start_id,end_id,card_ids,sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching menu categories:', error);
    return FALLBACK_MENU_SECTIONS;
  }

  if (!data?.length) return FALLBACK_MENU_SECTIONS;

  return data.map((section) => ({
    id: section.id,
    name: section.name,
    imageUrl: section.image_url,
    startId: section.start_id,
    endId: section.end_id,
    cardIds: section.card_ids?.length ? section.card_ids : undefined,
    sortOrder: section.sort_order,
  }));
}

export function useMenuCards() {
  return useQuery({
    queryKey: ['menu-cards'],
    queryFn: fetchMenuCards,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useMenuSections() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('menu-categories-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_categories' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['menu-sections'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['menu-sections'],
    queryFn: fetchMenuSections,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Group cards by section, honoring per-card `section` override
export function groupCardsBySections(
  cards: MenuCard[],
  sections: MenuSection[] = menuSections,
): Record<string, MenuCard[]> {
  const grouped: Record<string, MenuCard[]> = {};
  const overridden = new Set<number>();

  for (const section of sections) grouped[section.id] = [];

  for (const card of cards) {
    if (card.section && grouped[card.section]) {
      grouped[card.section].push(card);
      overridden.add(card.id);
    }
  }

  for (const section of sections) {
    const defaults = section.cardIds
      ? cards.filter((c) => section.cardIds?.includes(c.id) && !overridden.has(c.id))
      : cards.filter((c) => c.id >= section.startId && c.id <= section.endId && !overridden.has(c.id));
    grouped[section.id].push(...defaults);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.id - b.id);
  }

  return grouped;
}

export function defaultSectionIdForCard(
  id: number,
  sections: MenuSection[] = menuSections,
): string | null {
  const s = sections.find((sec) =>
    sec.cardIds ? sec.cardIds.includes(id) : id >= sec.startId && id <= sec.endId
  );
  return s?.id ?? null;
}
