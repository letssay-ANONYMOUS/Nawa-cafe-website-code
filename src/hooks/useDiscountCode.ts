import { useCallback, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/contexts/CartContext';

const STORAGE_KEY = 'nawa_promo_code';

export interface DiscountInfo {
  code: string;
  percent: number;
  scope: 'cart' | 'item';
  target_source: 'menu' | 'store' | null;
  target_name: string | null;
}

// -----------------------------------------------------------------------------
// Shared singleton store so every useDiscountCode() instance stays in sync —
// applying a code in <PromoCodeInput /> must instantly update totals in the
// parent page that also reads this hook.
// -----------------------------------------------------------------------------
const listeners = new Set<() => void>();
let currentCode: string = (() => {
  try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
})();

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};
const getSnapshot = () => currentCode;

function setSharedCode(next: string) {
  const normalized = next.trim().toUpperCase();
  if (normalized === currentCode) return;
  currentCode = normalized;
  try {
    if (normalized) localStorage.setItem(STORAGE_KEY, normalized);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage can be unavailable in private browsing; keep the in-memory code synced.
  }
  listeners.forEach((cb) => cb());
}

// Keep tabs in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      const next = (e.newValue || '').trim().toUpperCase();
      if (next !== currentCode) {
        currentCode = next;
        listeners.forEach((cb) => cb());
      }
    }
  });
}

async function fetchCode(code: string): Promise<DiscountInfo | null> {
  if (!code) return null;
  const { data, error } = await supabase.rpc('validate_discount_code', { _code: code });
  if (error) {
    console.error('validate_discount_code error', error);
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    code: row.code,
    percent: Number(row.percent),
    scope: row.scope as 'cart' | 'item',
    target_source: (row.target_source as 'menu' | 'store' | null) ?? null,
    target_name: row.target_name ?? null,
  };
}

/** Round half-away-from-zero to 2 decimals — avoids floating-point drift. */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeCodeDiscount(
  cartItems: CartItem[],
  subtotal: number,
  info: DiscountInfo | null,
): number {
  if (!info) return 0;
  const pct = Math.min(100, Math.max(0, info.percent)) / 100;

  if (info.scope === 'cart') {
    return round2(subtotal * pct);
  }

  if (!info.target_name) return 0;
  const target = info.target_name.trim().toLowerCase();
  let total = 0;
  for (const item of cartItems) {
    if ((item.name || '').trim().toLowerCase() === target) {
      total += item.price * item.quantity * pct;
    }
  }
  return round2(total);
}

export function useDiscountCode() {
  const code = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setCode = useCallback((next: string) => setSharedCode(next), []);
  const clear = useCallback(() => setSharedCode(''), []);

  const query = useQuery({
    queryKey: ['discount-code', code],
    queryFn: () => fetchCode(code),
    enabled: !!code,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    retry: 2,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });

  return {
    code,
    setCode,
    clear,
    info: query.data ?? null,
    loading: query.isFetching,
    invalid: !!code && query.isSuccess && !query.data,
  };
}
