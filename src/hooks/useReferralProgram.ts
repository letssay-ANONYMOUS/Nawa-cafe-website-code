import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralProgramConfig {
  enabled: boolean;
  /** Stamps the referrer earns per friend who completes a first order. */
  stampsPerReferral: number;
  /** Stamps the newly referred friend starts with. */
  friendStamps: number;
}

const QUERY_KEY = ['referral-program'] as const;
const SETTING_KEYS = [
  'referral_enabled',
  'referral_stamps_per_referral',
  'referral_friend_stamps',
] as const;

const DEFAULT_CONFIG: ReferralProgramConfig = {
  enabled: true,
  stampsPerReferral: 2,
  friendStamps: 1,
};

function toCount(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

async function fetchReferralProgram(): Promise<ReferralProgramConfig> {
  const { data, error } = await supabase
    .from('kitchen_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [...SETTING_KEYS]);
  if (error) throw error;

  const settings = new Map((data ?? []).map((row) => [row.setting_key, row.setting_value ?? '']));
  return {
    enabled: (settings.get('referral_enabled') || 'true') !== 'false',
    stampsPerReferral: toCount(settings.get('referral_stamps_per_referral'), DEFAULT_CONFIG.stampsPerReferral),
    friendStamps: toCount(settings.get('referral_friend_stamps'), DEFAULT_CONFIG.friendStamps),
  };
}

export function useReferralProgram() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('referral-program-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitchen_settings' },
        (payload) => {
          const key = (payload.new as { setting_key?: string })?.setting_key
            ?? (payload.old as { setting_key?: string })?.setting_key;
          if (key?.startsWith('referral_')) {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchReferralProgram,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (config: ReferralProgramConfig) => {
      const normalized: ReferralProgramConfig = {
        enabled: config.enabled,
        stampsPerReferral: Math.max(0, Math.floor(config.stampsPerReferral)),
        friendStamps: Math.max(0, Math.floor(config.friendStamps)),
      };
      const updatedAt = new Date().toISOString();
      const { error } = await supabase.from('kitchen_settings').upsert([
        { setting_key: 'referral_enabled', setting_value: String(normalized.enabled), updated_at: updatedAt },
        { setting_key: 'referral_stamps_per_referral', setting_value: String(normalized.stampsPerReferral), updated_at: updatedAt },
        { setting_key: 'referral_friend_stamps', setting_value: String(normalized.friendStamps), updated_at: updatedAt },
      ], { onConflict: 'setting_key' });
      if (error) throw error;

      const { error: recalcError } = await supabase.rpc('recalculate_all_customer_loyalty');
      if (recalcError) throw recalcError;
      return normalized;
    },
    onSuccess: (config) => queryClient.setQueryData(QUERY_KEY, config),
  });

  return {
    config: query.data ?? DEFAULT_CONFIG,
    loading: query.isLoading,
    save: mutation.mutateAsync,
    saving: mutation.isPending,
  };
}
