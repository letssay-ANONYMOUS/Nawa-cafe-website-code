DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'menu_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_categories;
  END IF;
END $$;
