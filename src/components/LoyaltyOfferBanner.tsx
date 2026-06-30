import { Gift } from 'lucide-react';
import { loyaltyTargetLabel, useLoyaltyProgram } from '@/hooks/useLoyaltyProgram';

export function LoyaltyOfferBanner({ source }: { source?: 'menu' | 'store' }) {
  const { config, loading } = useLoyaltyProgram();
  const targets = [...config.categoryTargets, ...config.itemTargets]
    .filter((target) => !source || target.startsWith(`${source}:`));

  if (loading || !config.enabled || targets.length === 0) return null;

  const visibleTargets = targets.slice(0, 3).map(loyaltyTargetLabel);
  const additionalCount = targets.length - visibleTargets.length;

  return (
    <section className="border-y border-coffee-200 bg-cream-100 px-4 py-3" aria-label="Current loyalty offer">
      <div className="container mx-auto flex max-w-6xl items-start gap-3 text-coffee-900 sm:items-center">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coffee-700 text-white">
          <Gift className="h-4 w-4" />
        </span>
        <div className="min-w-0 text-sm leading-5">
          <span className="font-semibold">{config.name}: </span>
          Collect {config.threshold} stamps and get 1 item free.
          <span className="ml-1 text-coffee-600">
            Gives a stamp: {visibleTargets.join(', ')}{additionalCount > 0 ? ` +${additionalCount} more` : ''}.
          </span>
        </div>
      </div>
    </section>
  );
}

export default LoyaltyOfferBanner;
