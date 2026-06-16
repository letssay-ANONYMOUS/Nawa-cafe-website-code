import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FALLBACK_STORE_CATEGORIES, type StoreCategoryConfig } from '@/data/storeCatalog';

async function fetchStoreCategories(): Promise<StoreCategoryConfig[]> {
  const { data, error } = await supabase
    .from('store_categories')
    .select('id,label,hero_title,hero_description,sort_order')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    console.error('Error fetching store categories:', error);
    return FALLBACK_STORE_CATEGORIES;
  }

  if (!data?.length) return FALLBACK_STORE_CATEGORIES;

  return data.map((category) => ({
    id: category.id,
    label: category.label,
    heroTitle: category.hero_title,
    heroDescription: category.hero_description,
    sortOrder: category.sort_order,
  }));
}

export function useStoreCategories() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('store-categories-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_categories' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['store-categories'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['store-categories'],
    queryFn: fetchStoreCategories,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
