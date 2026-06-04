ALTER TYPE public.order_type ADD VALUE IF NOT EXISTS 'delivery';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_area text,
  ADD COLUMN IF NOT EXISTS delivery_zone text CHECK (delivery_zone IS NULL OR delivery_zone IN ('near', 'mid', 'far')),
  ADD COLUMN IF NOT EXISTS delivery_fee numeric,
  ADD COLUMN IF NOT EXISTS delivery_fee_tbc boolean NOT NULL DEFAULT false;
