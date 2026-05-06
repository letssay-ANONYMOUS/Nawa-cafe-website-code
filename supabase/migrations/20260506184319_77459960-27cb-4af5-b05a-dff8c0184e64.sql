CREATE POLICY "Staff can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'menu-images' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'staff'::public.app_role)
  )
);

CREATE POLICY "Staff can update menu images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'menu-images' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'staff'::public.app_role)
  )
);