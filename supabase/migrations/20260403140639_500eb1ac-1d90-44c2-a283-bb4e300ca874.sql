
CREATE TABLE public.store_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_key INTEGER NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view store products"
  ON public.store_products FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert store products"
  ON public.store_products FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update store products"
  ON public.store_products FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Seed the 6 existing store products
INSERT INTO public.store_products (product_key, product_name, stock_quantity) VALUES
  (1, 'Premium Extra Virgin Olive Oil', 0),
  (2, 'Organic Single Estate Olive Oil', 0),
  (3, 'Infused Garlic & Herb Olive Oil', 0),
  (4, 'Early Harvest Olive Oil', 0),
  (5, 'Lemon Infused Olive Oil', 0),
  (6, 'Gift Set Collection', 0);

CREATE TRIGGER update_store_products_updated_at
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_menu_items_updated_at();
