import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SETTING_KEY = 'loyalty_discount_percent';
const DEFAULT_PERCENT = 15;

/**
 * The site-wide loyalty discount percent (0-100). Stored in `kitchen_settings`
 * under key `loyalty_discount_percent`. If unset/invalid → defaults to 15.
 * Staff can change or disable (set to 0) it from the Discounts page.
 */
export function useLoyaltyDiscount() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['loyalty-discount-percent'],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('kitchen_settings')
        .select('setting_value')
        .eq('setting_key', SETTING_KEY)
        .maybeSingle();
      if (error) {
        console.error('loyalty percent fetch error', error);
        return DEFAULT_PERCENT;
      }
      if (!data?.setting_value) return DEFAULT_PERCENT;
      const n = Number(data.setting_value);
      if (!Number.isFinite(n) || n < 0 || n > 100) return DEFAULT_PERCENT;
      return n;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (next: number) => {
      const value = Math.min(100, Math.max(0, Math.round(next)));
      const { error } = await supabase
        .from('kitchen_settings')
        .upsert(
          { setting_key: SETTING_KEY, setting_value: String(value), updated_at: new Date().toISOString() },
          { onConflict: 'setting_key' },
        );
      if (error) throw error;
      return value;
    },
    onSuccess: (value) => {
      qc.setQueryData(['loyalty-discount-percent'], value);
    },
  });

  return {
    percent: query.data ?? DEFAULT_PERCENT,
    loading: query.isLoading,
    save: mutation.mutateAsync,
    saving: mutation.isPending,
  };
}
