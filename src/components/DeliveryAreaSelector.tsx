import { useMemo, useState } from 'react';
import { MapPin, Search, Store, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DELIVERY_OPTIONS,
  UNLISTED_DELIVERY_AREA,
  calculateDeliveryFee,
  useDeliveryArea,
  useOrderFulfillment,
} from '@/lib/delivery';

interface DeliveryAreaSelectorProps {
  subtotal: number;
  error?: string;
}

export function DeliveryAreaSelector({ subtotal, error }: DeliveryAreaSelectorProps) {
  const { area, setArea } = useDeliveryArea();
  const { fulfillment, setFulfillment } = useOrderFulfillment();
  const [query, setQuery] = useState('');
  const delivery = calculateDeliveryFee(area, subtotal, fulfillment);
  const isDelivery = fulfillment === 'delivery';

  const filteredOptions = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return DELIVERY_OPTIONS;
    return DELIVERY_OPTIONS.filter((option) => option.toLowerCase().includes(clean));
  }, [query]);

  return (
    <div className="space-y-3 rounded-lg border border-coffee-200 bg-cream-50 p-4">
      <Label className="text-coffee-800">
        Order Type
      </Label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setFulfillment('dine_in')}
          className={`flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors active:scale-[0.98] ${
            fulfillment === 'dine_in'
              ? 'border-coffee-600 bg-coffee-600 text-white'
              : 'border-coffee-200 bg-white text-coffee-700 hover:bg-cream-100'
          }`}
        >
          <Store className="h-4 w-4" />
          Dine in
        </button>
        <button
          type="button"
          onClick={() => setFulfillment('delivery')}
          className={`flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors active:scale-[0.98] ${
            fulfillment === 'delivery'
              ? 'border-coffee-600 bg-coffee-600 text-white'
              : 'border-coffee-200 bg-white text-coffee-700 hover:bg-cream-100'
          }`}
        >
          <Truck className="h-4 w-4" />
          Delivery
        </button>
      </div>

      {isDelivery ? (
        <div className="space-y-3 pt-2">
          <Label htmlFor="delivery-area" className="flex items-center gap-2 text-coffee-800">
            <MapPin className="w-4 h-4" />
            Delivery Area
          </Label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your area"
              className="pl-9 bg-white"
            />
          </div>

          <select
            id="delivery-area"
            required
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-coffee-800 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Choose delivery area</option>
            {filteredOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="rounded-md border border-coffee-200 bg-white p-3 text-sm text-coffee-700">
          Dine-in orders have no delivery fee.
        </p>
      )}

      {isDelivery && area && !filteredOptions.includes(area) && (
        <p className="text-xs text-coffee-500">
          Selected: <span className="font-medium">{area}</span>
        </p>
      )}

      {isDelivery && delivery?.isTbc && (
        <p className="text-sm font-medium text-coffee-700">
          We'll confirm your delivery fee by phone.
        </p>
      )}

      {isDelivery && delivery && !delivery.isTbc && delivery.freeOver !== null && (
        <p className="text-sm text-coffee-600">
          {delivery.isFree
            ? `Delivery is free for ${area}.`
            : `Delivery to ${area} is ${delivery.label}. Free over AED ${delivery.freeOver.toFixed(2)}.`}
        </p>
      )}

      {isDelivery && area === UNLISTED_DELIVERY_AREA && (
        <p className="text-xs text-coffee-500">
          Your order can continue. Nawa Cafe will call you before confirming the final delivery amount.
        </p>
      )}

      {isDelivery && error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}

export default DeliveryAreaSelector;
