import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, X, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDiscountCode } from '@/hooks/useDiscountCode';

export function PromoCodeInput() {
  const { code, setCode, clear, info, loading, invalid } = useDiscountCode();
  const [draft, setDraft] = useState(code);

  // Only render the promo field when at least one active code exists.
  // If the staff hasn't created any active code, the checkout/cart stays clean.
  const { data: hasActiveCodes, isLoading: checkingCodes } = useQuery({
    queryKey: ['has-active-discount-codes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('has_active_discount_codes');
      if (error) {
        console.error('has_active_discount_codes error', error);
        return false;
      }
      return !!data;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Keep showing the box if the user already has a code applied (even if
  // staff later disables all codes) so they can see/remove it.
  if (!hasActiveCodes && !code && !checkingCodes) return null;

  const apply = () => {
    setCode(draft);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-coffee-700 flex items-center gap-1.5">
        <Tag className="w-4 h-4" />
        Promo code
      </label>

      {info && code ? (
        <div className="flex items-center justify-between gap-2 p-3 rounded-md border border-green-300 bg-green-50">
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-700" />
            <span className="font-mono font-bold text-green-800">{info.code}</span>
            <span className="text-green-700">
              −{info.percent}% {info.scope === 'cart' ? 'on cart' : `on ${info.target_name}`}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { clear(); setDraft(''); }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
            placeholder="Enter code"
            className="font-mono uppercase"
            maxLength={32}
          />
          <Button type="button" variant="outline" onClick={apply} disabled={!draft || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
          </Button>
        </div>
      )}

      {invalid && (
        <p className="text-xs text-destructive">Invalid or expired code.</p>
      )}
    </div>
  );
}

export default PromoCodeInput;
