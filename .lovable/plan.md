

## Plan: Kitchen Stock Images, Store Card Security, and Product Detail Stock Display

### 1. Add product images to Kitchen StockManager cards
Show the product image on each stock management card so staff can visually identify products. The images will use the same paths as the store page products (e.g., `/olive-oils/premium-evoo.jpg`). A small image thumbnail will be added to each card header.

**File**: `src/components/kitchen/StockManager.tsx`
- Add a mapping of `product_key` to image path
- Display a thumbnail image in each stock card

### 2. Restrict edit/delete buttons to admin-only on store cards
Currently the edit (pencil) and delete (X) buttons on store product cards are shown to any user with `isAdmin` from `AdminContext` — but since `isAdmin` is set true for both admin and staff roles, normal customers never see them. However, the `onEdit` and `onDelete` callbacks are always passed from `StorePage`. The real issue is that normal (non-admin) users should not see the edit/delete overlay buttons at all.

**File**: `src/components/StoreProductCard.tsx`
- Already gated by `isAdmin` check — this is correct since only authenticated admin/staff get `isAdmin = true`
- Also hide the "Add New Card" button for non-admins (already done in StorePage)
- No database RLS change needed — `store_products` already restricts INSERT/UPDATE to staff/admin roles, and there's no DELETE policy

### 3. Move stock badge from card image to card detail section
Remove the stock badge overlay from the product image area and place the stock info between the price and volume in the `CardContent` section.

**File**: `src/components/StoreProductCard.tsx`
- Remove the stock Badge from inside the image div (lines 79-83)
- Add stock display between price and volume in CardContent

### 4. Add stock info to ProductDetail page
Fetch stock from database and display it between the price and the volume info on the product detail page.

**File**: `src/pages/ProductDetail.tsx`
- Fetch stock from `store_products` table using the product id
- Display stock status between the price (`AED X`) and the "Add to Cart" button
- Disable "Add to Cart" when stock is 0

### Summary of files to change
- `src/components/kitchen/StockManager.tsx` — add product images
- `src/components/StoreProductCard.tsx` — move stock from image overlay to card details
- `src/pages/ProductDetail.tsx` — add stock fetch and display

