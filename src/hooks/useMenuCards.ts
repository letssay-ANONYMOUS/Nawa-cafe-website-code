import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MenuCard {
  id: number;
  name: string | null;
  price: string | null;
  description: string | null;
  image_url: string | null;
}

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
