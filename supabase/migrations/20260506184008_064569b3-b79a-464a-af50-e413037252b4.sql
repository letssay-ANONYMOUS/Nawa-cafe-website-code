-- Extend store_products to be the source of truth for all store cards
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'oil',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS volume text,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS rating integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS coming_soon boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Backfill existing oil rows
UPDATE public.store_products SET category='oil' WHERE category IS NULL OR category = '';

-- Seed honey + coffee bean rows (idempotent)
INSERT INTO public.store_products (product_key, product_name, stock_quantity, category, description, price, image_url, volume, origin, badge, rating, coming_soon, sort_order)
VALUES
  (101, 'Wildflower Honey Reserve', 0, 'honey', 'Placeholder product for the upcoming honey collection with a smooth floral profile.', 95, '/src/assets/store/honey-placeholder.jpg', '350g', 'UAE', 'Coming Soon', 5, true, 1),
  (102, 'Mountain Blossom Honey', 0, 'honey', 'Placeholder product for a richer amber honey offering with layered sweetness.', 110, '/src/assets/store/honey-placeholder.jpg', '500g', 'Oman', 'Preview', 5, true, 2),
  (103, 'Signature Honey Gift Jar', 0, 'honey', 'Placeholder product for a premium gifting honey format to be detailed later.', 135, '/src/assets/store/honey-placeholder.jpg', '2x250g', 'Mixed', 'Gift', 5, true, 3),
  (201, 'House Espresso Beans', 0, 'coffee-beans', 'Placeholder product for our signature espresso roast with balanced chocolate notes.', 78, '/src/assets/store/coffee-beans-placeholder.jpg', '250g', 'Brazil', 'Coming Soon', 5, true, 1),
  (202, 'Single Origin Filter Beans', 0, 'coffee-beans', 'Placeholder product for a bright, fruit-forward filter roast to be finalized later.', 92, '/src/assets/store/coffee-beans-placeholder.jpg', '250g', 'Ethiopia', 'Preview', 5, true, 2),
  (203, 'Nawa Blend Coffee Beans', 0, 'coffee-beans', 'Placeholder product for our future house blend crafted for everyday brewing.', 88, '/src/assets/store/coffee-beans-placeholder.jpg', '500g', 'Mixed', 'House Blend', 5, true, 3)
ON CONFLICT (product_key) DO NOTHING;

-- Enrich existing oil rows with full metadata
UPDATE public.store_products SET description='Cold-pressed from hand-picked olives in the Mediterranean. Rich, fruity flavor with peppery finish.', price=312, image_url='/olive-oils/premium-evoo.jpg', volume='500ml', origin='Italy', badge='Bestseller', sort_order=1 WHERE product_key=1;
UPDATE public.store_products SET description='Certified organic, single-origin olive oil with delicate notes of grass and artichoke.', price=349, image_url='/olive-oils/organic-estate.jpg', volume='750ml', origin='Spain', badge='Organic', sort_order=2 WHERE product_key=2;
UPDATE public.store_products SET description='Premium olive oil infused with fresh garlic, rosemary, and Mediterranean herbs.', price=275, image_url='/olive-oils/garlic-herb.jpg', volume='250ml', origin='Greece', badge='Limited', rating=4, sort_order=3 WHERE product_key=3;
UPDATE public.store_products SET description='Made from green, early-harvest olives for intense flavor and maximum health benefits.', price=386, image_url='/olive-oils/early-harvest.jpg', volume='500ml', origin='Italy', badge='Premium', sort_order=4 WHERE product_key=4;
UPDATE public.store_products SET description='Bright and zesty olive oil infused with fresh Mediterranean lemons. Perfect for salads.', price=257, image_url='/olive-oils/lemon-infused.jpg', volume='250ml', origin='Greece', badge='New', sort_order=5 WHERE product_key=5;
UPDATE public.store_products SET description='Curated selection of three premium olive oils in an elegant gift box.', price=661, image_url='/olive-oils/gift-set.jpg', volume='3x250ml', origin='Mixed', badge='Gift Set', sort_order=6 WHERE product_key=6;

-- Add unique constraint on product_key if missing for upsert safety
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_products_product_key_unique'
  ) THEN
    ALTER TABLE public.store_products ADD CONSTRAINT store_products_product_key_unique UNIQUE (product_key);
  END IF;
END $$;