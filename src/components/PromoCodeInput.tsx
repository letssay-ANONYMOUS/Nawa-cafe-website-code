import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, X, Loader2, Check } from 'lucide-react';
import { useDiscountCode } from '@/hooks/useDiscountCode';

export function PromoCodeInput() {
  const { code, setCode, clear, info, loading, invalid } = useDiscountCode();
  const [draft, setDraft] = useState(code);

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
