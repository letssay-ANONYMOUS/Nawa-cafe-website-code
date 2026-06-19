import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LoyaltyProgramConfig {
  enabled: boolean;
  name: string;
  threshold: number;
  rewardQuantity: number;
  categoryTargets: string[];
  itemTargets: string[];
}

const QUERY_KEY = ['loyalty-program'] as const;
const SETTING_KEYS = [
  'loyalty_enabled',
  'loyalty_program_name',
  'loyalty_threshold',
  'loyalty_reward_qty',
  'loyalty_eligible_categories',
  'loyalty_eligible_items',
] as const;

const DEFAULT_CONFIG: LoyaltyProgramConfig = {
  enabled: true,
  name: 'Nawa Rewards',
  threshold: 10,
  rewardQuantity: 1,
  categoryTargets: [],
  itemTargets: [],
};

function parseTargets(value: string | undefined): string[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').map((item) => item.toLowerCase())
      : [];
  } catch {
    return [];
  }
}

async function fetchLoyaltyProgram(): Promise<LoyaltyProgramConfig> {
  const { data, error } = await supabase
    .from('kitchen_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [...SETTING_KEYS]);
  if (error) throw error;

  const settings = new Map((data ?? []).map((row) => [row.setting_key, row.setting_value ?? '']));
  const threshold = Number(settings.get('loyalty_threshold'));
  const rewardQuantity = Number(settings.get('loyalty_reward_qty'));

  return {
    enabled: (settings.get('loyalty_enabled') || 'true') !== 'false',
    name: settings.get('loyalty_program_name')?.trim() || DEFAULT_CONFIG.name,
    threshold: Number.isFinite(threshold) && threshold > 0 ? Math.floor(threshold) : DEFAULT_CONFIG.threshold,
    rewardQuantity: Number.isFinite(rewardQuantity) && rewardQuantity > 0
      ? Math.floor(rewardQuantity)
      : DEFAULT_CONFIG.rewardQuantity,
    categoryTargets: parseTargets(settings.get('loyalty_eligible_categories')),
    itemTargets: parseTargets(settings.get('loyalty_eligible_items')),
  };
}

export function useLoyaltyProgram() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('loyalty-program-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitchen_settings' },
        (payload) => {
          const key = (payload.new as { setting_key?: string })?.setting_key
            ?? (payload.old as { setting_key?: string })?.setting_key;
          if (key?.startsWith('loyalty_')) {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchLoyaltyProgram,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (config: LoyaltyProgramConfig) => {
      const normalized: LoyaltyProgramConfig = {
        enabled: config.enabled,
        name: config.name.trim() || DEFAULT_CONFIG.name,
        threshold: Math.max(1, Math.floor(config.threshold)),
        rewardQuantity: Math.max(1, Math.floor(config.rewardQuantity)),
        categoryTargets: [...new Set(config.categoryTargets.map((value) => value.toLowerCase()))],
        itemTargets: [...new Set(config.itemTargets.map((value) => value.toLowerCase()))],
      };
      const updatedAt = new Date().toISOString();
      const rows = [
        { setting_key: 'loyalty_enabled', setting_value: String(normalized.enabled), updated_at: updatedAt },
        { setting_key: 'loyalty_program_name', setting_value: normalized.name, updated_at: updatedAt },
        { setting_key: 'loyalty_threshold', setting_value: String(normalized.threshold), updated_at: updatedAt },
        { setting_key: 'loyalty_reward_qty', setting_value: String(normalized.rewardQuantity), updated_at: updatedAt },
        { setting_key: 'loyalty_eligible_categories', setting_value: JSON.stringify(normalized.categoryTargets), updated_at: updatedAt },
        { setting_key: 'loyalty_eligible_items', setting_value: JSON.stringify(normalized.itemTargets), updated_at: updatedAt },
      ];
      const { error } = await supabase.from('kitchen_settings').upsert(rows, { onConflict: 'setting_key' });
      if (error) throw error;

      const { error: recalculateError } = await supabase.rpc('recalculate_all_customer_loyalty');
      if (recalculateError) throw recalculateError;
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

export function loyaltyTargetLabel(target: string): string {
  const [, value = target] = target.split(':', 2);
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
