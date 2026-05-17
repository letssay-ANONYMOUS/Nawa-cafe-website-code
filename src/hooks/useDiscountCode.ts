import { useCallback, useEffect, useState } from 'react';
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

async function fetchCode(code: string): Promise<DiscountInfo | null> {
  if (!code) return null;
  const { data, error } = await supabase.rpc('validate_discount_code', {
    _code: code,
  });
  if (error) {
    console.error('validate_discount_code error', error);
    return null;
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

/**
 * Round half-away-from-zero to 2 decimals — avoids floating-point drift
 * (e.g. 0.1 + 0.2). Use ONLY at the very end for display/storage.
 */
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

  // scope = 'item' — match by exact name
  if (!info.target_name) return 0;
  const target = info.target_name.trim().toLowerCase();
  let total = 0;
  for (const item of cartItems) {
    if (item.name.trim().toLowerCase() === target) {
      total += item.price * item.quantity * pct;
    }
  }
  return round2(total);
}

export function useDiscountCode() {
  const [code, setCodeState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const setCode = useCallback((next: string) => {
    const normalized = next.trim().toUpperCase();
    setCodeState(normalized);
    try {
      if (normalized) localStorage.setItem(STORAGE_KEY, normalized);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const clear = useCallback(() => setCode(''), [setCode]);

  const query = useQuery({
    queryKey: ['discount-code', code],
    queryFn: () => fetchCode(code),
    enabled: !!code,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    retry: 1,
  });

  return {
    code,
    setCode,
    clear,
    info: query.data ?? null,
    loading: query.isFetching,
    invalid: !!code && !query.isFetching && !query.data,
  };
}
