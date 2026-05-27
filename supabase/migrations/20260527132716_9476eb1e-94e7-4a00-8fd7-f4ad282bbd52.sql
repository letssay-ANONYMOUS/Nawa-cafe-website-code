
-- 1. kitchen_settings: restrict writes to staff/admin
DROP POLICY IF EXISTS "Allow insert access to kitchen settings" ON public.kitchen_settings;
DROP POLICY IF EXISTS "Allow update access to kitchen settings" ON public.kitchen_settings;

CREATE POLICY "Staff can insert kitchen settings"
  ON public.kitchen_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff can update kitchen settings"
  ON public.kitchen_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- 2. shared_payments: remove public UPDATE entirely (edge function uses service role)
DROP POLICY IF EXISTS "Anyone can update shared payments" ON public.shared_payments;

-- 3. anonymous_visitors: remove public UPDATE (edge function uses service role)
DROP POLICY IF EXISTS "Anyone can update anonymous visitors" ON public.anonymous_visitors;

-- 4. visitor_sessions: remove public UPDATE
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.visitor_sessions;

-- 5. Storage: staff-only DELETE policy on menu-images bucket
CREATE POLICY "Staff can delete menu images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'menu-images' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  );
