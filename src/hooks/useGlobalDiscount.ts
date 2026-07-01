import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DiscountInfo } from '@/hooks/useDiscountCode';

const QUERY_KEY = ['active-global-discount'] as const;

async function fetchGlobalDiscount(): Promise<DiscountInfo | null> {
  const { data, error } = await supabase.rpc('get_active_global_discount');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    code: row.code,
    display_name: row.display_name ?? row.code,
    percent: Number(row.percent),
    scope: row.scope as DiscountInfo['scope'],
    target_source: (row.target_source as DiscountInfo['target_source']) ?? null,
    target_name: row.target_name ?? null,
  };
}

export function useGlobalDiscount() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('global-discount-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'discount_codes' },
        () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchGlobalDiscount,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}
