import { useCallback, useSyncExternalStore } from 'react';

export const UNLISTED_DELIVERY_AREA = "My area isn't listed";
const AREA_STORAGE_KEY = 'nawa_delivery_area';
const FULFILLMENT_STORAGE_KEY = 'nawa_order_fulfillment';

export type OrderFulfillment = 'dine_in' | 'delivery';

// Owner-editable delivery fee table from the latest delivery spreadsheet.
// Update only fee values here when Nawa changes delivery pricing.
export const DISTRICT_DELIVERY_FEE = {
  'Al Bateen': 15,
  'Al Dhaher': 20,
  'Al Foah': 20,
  'Al Jahili': 15,
  'Al Jimi': 15,
  'Al Khabisi': 15,
  'Al Khrair': 20,
  'Al Maqam': 15,
  'Al Markhaniya': 15,
  'Al Masoudi': 15,
  'Al Mutaredh': 15,
  'Al Mutawaa': 15,
  'Al Muwaiji': 15,
  'Al Niyadat': 15,
  'Al Qattara': 15,
  'Al Salamat': 15,
  'Al Saniya': 15,
  'Al Sarooj': 15,
  'Al Shuaibah': 20,
  'Al Towayya': 15,
  'Al Yahar': 25,
  Asharej: 15,
  'Central District': 15,
  'Falaj Hazza': 15,
  Hili: 20,
  Neima: 20,
  Tawam: 15,
  Zakhir: 15,
} as const;

export type DeliveryArea = keyof typeof DISTRICT_DELIVERY_FEE;
export type DeliveryZone = 'standard' | 'extended' | 'remote';

export const DELIVERY_AREAS = [
  ...Object.keys(DISTRICT_DELIVERY_FEE),
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
  const fee = DISTRICT_DELIVERY_FEE[area as DeliveryArea];
  if (fee === 15) return 'standard';
  if (fee === 20) return 'extended';
  if (fee === 25) return 'remote';
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

  const fee = DISTRICT_DELIVERY_FEE[area as DeliveryArea];
  return {
    area,
    zone,
    fee,
    freeOver: null,
    isFree: false,
    isTbc: false,
    label: `AED ${fee.toFixed(2)}`,
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
