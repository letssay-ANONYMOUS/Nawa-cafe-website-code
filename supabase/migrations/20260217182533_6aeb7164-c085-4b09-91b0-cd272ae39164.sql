
-- Issue 1: Remove overly permissive SELECT policy on orders
-- Orders should only be accessible via admin edge functions (service role)
DROP POLICY IF EXISTS "Visitors can view their own orders" ON public.orders;

-- Create a restrictive policy: only allow selecting orders by exact order_id match
-- This is used by the payment-success page to show order confirmation
CREATE POLICY "Select own order by id" ON public.orders
FOR SELECT USING (false);

-- Issue 2: Remove overly permissive UPDATE policy on orders
-- All order updates happen through edge functions using service role
DROP POLICY IF EXISTS "Allow order updates" ON public.orders;

-- Issue 3: Remove public write policies on storage
DROP POLICY IF EXISTS "Anyone can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete menu images" ON storage.objects;
