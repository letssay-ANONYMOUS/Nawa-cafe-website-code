import { useCallback, useSyncExternalStore } from 'react';

export const UNLISTED_DELIVERY_AREA = "My area isn't listed";
const AREA_STORAGE_KEY = 'nawa_delivery_area';
const FULFILLMENT_STORAGE_KEY = 'nawa_order_fulfillment';

export type OrderFulfillment = 'dine_in' | 'delivery';

// Owner-editable delivery zone buckets. Move districts between arrays here
// without changing the fee calculation logic below.
export const DISTRICT_ZONE = {
  near: [
    'Al Towayya',
    'Al Mutawaa',
    'Al Jimi',
    'Al Mutaredh',
    'Al Khabisi',
    'Al Muwaiji',
    'Al Qattara',
    'Al Masoudi',
  ],
  mid: [
    'Central District',
    'Al Jahili',
    'Hili',
    'Falaj Hazza',
    'Asharej',
    'Al Markhaniya',
    'Al Bateen',
    'Al Sarooj',
    'Tawam',
    'Al Saniya',
    'Al Maqam',
    'Al Khrair',
    'Al Niyadat',
  ],
  far: [
    'Zakhir',
    'Al Foah',
    'Neima',
    'Al Salamat',
    'Al Shuaibah',
    'Al Dhaher',
    'Al Yahar',
  ],
} as const;

// Owner-editable zone fees. `freeOver` means delivery is free when the cart
// subtotal is greater than or equal to this amount.
export const ZONE_FEE = {
  near: { fee: 5, freeOver: 50 },
  mid: { fee: 10, freeOver: 80 },
  far: { fee: 15, freeOver: 120 },
} as const;

export type DeliveryZone = keyof typeof DISTRICT_ZONE;

export const DELIVERY_AREAS = [
  ...Object.values(DISTRICT_ZONE).flat(),
].sort((a, b) => a.localeCompare(b));

export const DELIVERY_OPTIONS = [...DELIVERY_AREAS, UNLISTED_DELIVERY_AREA];

export interface DeliveryFeeResult {
  area: string;
  zone: DeliveryZone | null;
  fee: number | null;
  freeOver: number | null;
  isFree: boolean;
  isTbc: boolean;
  label: string;
}

export function getFulfillmentLabel(fulfillment: OrderFulfillment): string {
  return fulfillment === 'dine_in' ? 'Dine in' : 'Delivery';
}

export function getDeliveryZone(area: string): DeliveryZone | null {
  for (const [zone, districts] of Object.entries(DISTRICT_ZONE) as [DeliveryZone, readonly string[]][]) {
    if (districts.includes(area)) return zone;
  }
  return null;
}

export function calculateDeliveryFee(
  area: string,
  subtotal: number,
  fulfillment: OrderFulfillment = 'delivery',
): DeliveryFeeResult | null {
  if (fulfillment === 'dine_in') {
    return {
      area: '',
      zone: null,
      fee: 0,
      freeOver: null,
      isFree: true,
      isTbc: false,
      label: 'Free',
    };
  }

  if (!area) return null;

  if (area === UNLISTED_DELIVERY_AREA) {
    return {
      area,
      zone: null,
      fee: null,
      freeOver: null,
      isFree: false,
      isTbc: true,
      label: 'TBC',
    };
  }

  const zone = getDeliveryZone(area);
  if (!zone) return null;

  const rule = ZONE_FEE[zone];
  const isFree = subtotal >= rule.freeOver;
  const fee = isFree ? 0 : rule.fee;
  return {
    area,
    zone,
    fee,
    freeOver: rule.freeOver,
    isFree,
    isTbc: false,
    label: isFree ? 'Free' : `AED ${fee.toFixed(2)}`,
  };
}

const listeners = new Set<() => void>();
let currentArea = (() => {
  try { return localStorage.getItem(AREA_STORAGE_KEY) || ''; } catch { return ''; }
})();
let currentFulfillment: OrderFulfillment = (() => {
  try {
    const stored = localStorage.getItem(FULFILLMENT_STORAGE_KEY);
    return stored === 'dine_in' || stored === 'delivery' ? stored : 'delivery';
  } catch {
    return 'delivery';
  }
})();

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};
const getSnapshot = () => currentArea;

function setSharedArea(next: string) {
  const normalized = DELIVERY_OPTIONS.includes(next) ? next : '';
  if (normalized === currentArea) return;
  currentArea = normalized;
  try {
    if (normalized) localStorage.setItem(AREA_STORAGE_KEY, normalized);
    else localStorage.removeItem(AREA_STORAGE_KEY);
  } catch {
    // Keep in-memory state synced if localStorage is unavailable.
  }
  listeners.forEach((cb) => cb());
}

const getFulfillmentSnapshot = () => currentFulfillment;

function setSharedFulfillment(next: OrderFulfillment) {
  if (next === currentFulfillment) return;
  currentFulfillment = next;
  try {
    localStorage.setItem(FULFILLMENT_STORAGE_KEY, next);
  } catch {
    // Keep in-memory state synced if localStorage is unavailable.
  }
  listeners.forEach((cb) => cb());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === AREA_STORAGE_KEY) {
      const next = e.newValue || '';
      currentArea = DELIVERY_OPTIONS.includes(next) ? next : '';
      listeners.forEach((cb) => cb());
    }
    if (e.key === FULFILLMENT_STORAGE_KEY) {
      const next = e.newValue;
      currentFulfillment = next === 'dine_in' || next === 'delivery' ? next : 'delivery';
      listeners.forEach((cb) => cb());
    }
  });
}

export function useDeliveryArea() {
  const area = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setArea = useCallback((next: string) => setSharedArea(next), []);
  const clearArea = useCallback(() => setSharedArea(''), []);
  return { area, setArea, clearArea };
}

export function useOrderFulfillment() {
  const fulfillment = useSyncExternalStore(subscribe, getFulfillmentSnapshot, getFulfillmentSnapshot);
  const setFulfillment = useCallback((next: OrderFulfillment) => setSharedFulfillment(next), []);
  return { fulfillment, setFulfillment };
}
