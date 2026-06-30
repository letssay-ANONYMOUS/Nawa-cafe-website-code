import { useQuery } from '@tanstack/react-query';
import type { CartItem } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { round2 } from '@/hooks/useDiscountCode';
import { useLoyaltyProgram } from '@/hooks/useLoyaltyProgram';

interface ItemIdentity {
  source: 'menu' | 'store';
  category: string;
}

export function useLoyaltyReward(cartItems: CartItem[], userId?: string) {
  const { config } = useLoyaltyProgram();
  const names = [...new Set(cartItems.map((item) => item.name).filter(Boolean))].sort();

  const query = useQuery({
    queryKey: ['loyalty-reward-quote', userId ?? '', names, config],
    enabled: Boolean(userId && config.enabled && names.length > 0),
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;

      const { data: account } = await supabase
        .from('loyalty_accounts')
        .select('free_drinks_available')
        .eq('user_id', userId)
        .maybeSingle();
      if ((account?.free_drinks_available ?? 0) < 1) return 0;

      const [menuItems, menuCards, storeProducts] = await Promise.all([
        supabase.from('menu_items').select('title, category').in('title', names),
        supabase.from('menu_cards').select('name, section').in('name', names),
        supabase.from('store_products').select('product_name, category').in('product_name', names),
      ]);

      const identities = new Map<string, ItemIdentity>();
      for (const item of menuItems.data ?? []) {
        identities.set(item.title.toLowerCase(), { source: 'menu', category: item.category });
      }
      for (const card of menuCards.data ?? []) {
        if (card.name) identities.set(card.name.toLowerCase(), { source: 'menu', category: card.section ?? '' });
      }
      for (const product of storeProducts.data ?? []) {
        identities.set(product.product_name.toLowerCase(), { source: 'store', category: product.category });
      }

      // Mirrors create-ziina-checkout: any stamp-giving menu card can be the
      // free item. The separate redeemable set can add redemption-only cards,
      // but it never excludes stamped cards. Menu only — store never redeems.
      const eligiblePrices = cartItems
        .filter((item) => {
          const name = item.name.toLowerCase();
          const identity = identities.get(name);
          if (!identity || identity.source !== 'menu') return false;
          const itemKey = `menu:${name}`;
          return config.redeemableItemTargets.includes(itemKey)
            || config.itemTargets.includes(itemKey)
            || config.categoryTargets.includes(`menu:${identity.category}`.toLowerCase());
        })
        .map((item) => item.price)
        .filter((price) => Number.isFinite(price) && price > 0);

      return eligiblePrices.length > 0 ? round2(Math.min(...eligiblePrices)) : 0;
    },
    staleTime: 15 * 1000,
  });

  return {
    amount: query.data ?? 0,
    loading: query.isLoading,
  };
}
