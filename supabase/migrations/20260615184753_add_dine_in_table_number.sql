ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_number text;

CREATE INDEX IF NOT EXISTS orders_table_number_idx
  ON public.orders(table_number)
  WHERE table_number IS NOT NULL;
