import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PriceSummaryRowProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

const PriceSummaryRow = ({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: PriceSummaryRowProps) => (
  <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3', className)}>
    <span className={cn('min-w-0 break-words', labelClassName)}>{label}</span>
    <span className={cn('shrink-0 whitespace-nowrap text-right tabular-nums', valueClassName)}>
      {value}
    </span>
  </div>
);

export default PriceSummaryRow;
