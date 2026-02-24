
# Replace Kitchen Hardcoded Password with Supabase Auth

## Overview
Remove the custom password/HMAC session system on the kitchen route and replace it with proper Supabase Auth (email/password login). The kitchen dashboard will only render for authenticated users, and orders will be fetched directly from the database using RLS policies tied to the authenticated user, with Realtime subscriptions for instant updates.

## Changes

### 1. Database Migration
- Create a `user_roles` table with an `app_role` enum (`admin`, `staff`) to control access
- Add RLS policies so only authenticated users with `admin` or `staff` roles can SELECT from `orders` and `order_items`
- Create a `has_role()` security definer function to avoid recursive RLS
- Enable Realtime on the `orders` table (`ALTER PUBLICATION supabase_realtime ADD TABLE public.orders`)
- Seed an initial staff user (you'll set their email/password via the Auth system)

### 2. New: `src/components/KitchenAuthGate.tsx`
A wrapper component that:
- Checks `supabase.auth.getSession()` on mount
- Listens to `onAuthStateChange` for login/logout
- If not authenticated, renders a login form (email + password)
- If authenticated, verifies the user has `staff` or `admin` role via the `user_roles` table
- If authorized, renders the kitchen dashboard as children

### 3. Replace `src/pages/StaffLogin.tsx`
Rewrite to use Supabase Auth instead of the custom admin-login edge function:
- Standard email/password form calling `supabase.auth.signInWithPassword()`
- On success, redirect to `/admin/kitchen`
- Remove all references to `sessionStorage` admin tokens

### 4. Update `src/pages/KitchenDashboard.tsx`
Key changes:
- **Remove** `checkAuth()` function (no more sessionStorage/admin-session calls)
- **Remove** the `admin-orders` edge function fetch -- query `orders` and `order_items` tables directly via the Supabase client (RLS will gate access)
- **Replace** the 10-second polling interval with a Supabase Realtime subscription:
  ```text
  supabase.channel('kitchen-orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, handler)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, handler)
    .subscribe()
  ```
  (The existing `setupRealtimeSubscription()` function already has this logic but was never called -- it will be activated and connected)
- **Update** logout to call `supabase.auth.signOut()` then navigate to `/staff/login`
- **Remove** all `sessionStorage` admin token references

### 5. Update `src/App.tsx`
- Wrap the `/admin/kitchen` route with the auth gate component
- The `/staff/login` route stays as the entry point

### 6. RLS Policy Changes (via migration)

**New policies on `orders`:**
- `SELECT` for authenticated users with `staff` or `admin` role (replaces the current `USING (false)` policy)

**New policies on `order_items`:**
- `SELECT` for authenticated users with `staff` or `admin` role (replaces the current public `USING (true)` policy which is a security issue)

### 7. Cleanup
- The `admin-orders` edge function remains available for analytics but the kitchen dashboard no longer depends on it
- The `admin-login` and `admin-session` edge functions remain for the separate admin dashboard (not part of this change)

## Technical Details

### Migration SQL (summary)
```text
-- Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TABLE public.user_roles (...);

-- Security definer function
CREATE FUNCTION public.has_role(uuid, app_role) ...;

-- New RLS on orders: staff/admin can SELECT
CREATE POLICY "Staff can view orders" ON orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Same for order_items
-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
```

### Data flow (after change)
```text
Staff opens /staff/login
  -> enters email + password
  -> supabase.auth.signInWithPassword()
  -> redirects to /admin/kitchen
  -> KitchenAuthGate checks session + role
  -> KitchenDashboard queries orders directly (RLS allows it)
  -> Realtime subscription fires on new/updated orders
  -> Dashboard updates instantly
```

## What stays the same
- The admin dashboard (`/admin`) and its separate login flow remain unchanged
- The `AdminPasswordModal` and `AdminContext` are unaffected
- All other edge functions continue working as before
