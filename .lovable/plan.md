# Store improvements: navigation, stock & card editing

Three connected fixes for the Store experience and Kitchen dashboard.

---

## 1. Fix back-arrow returning to wrong category

**Problem:** From Store → Coffee Beans → open product → back arrow → page resets to "Oil" (the default `useState`).

**Cause:** `StorePage` keeps `activeCategory` in component state only. When `ProductDetail` calls `navigate(-1)`, `StorePage` remounts with `'oil'` as default and the scroll position is lost.

**Fix:**
- Persist `activeCategory` in `sessionStorage` (`store:activeCategory`) and rehydrate on mount.
- Persist scroll position in `sessionStorage` (`store:scrollY`) when leaving, restore after products render.
- Result: Honey → product → back returns to Honey at the same scroll position. Same for Coffee Beans.

---

## 2. Seed Honey & Coffee Beans in Stock + grouped UI

**Database migration** — extend `store_products` so it becomes the single source of truth for every store card:

Add columns to `store_products`:
- `category text` (`'oil' | 'honey' | 'coffee-beans'`)
- `description text`
- `price numeric`
- `image_url text`
- `volume text`
- `origin text`
- `badge text`
- `rating int default 5`
- `coming_soon boolean default false`
- `sort_order int`

Seed rows for the 6 honey + coffee-bean products (IDs 101–103, 201–203) currently hardcoded in `src/data/storeCatalog.ts`, including images stored in `src/assets/store/`.

RLS unchanged (already: public read, staff insert/update).

**StockManager UI** (`src/components/kitchen/StockManager.tsx`):
- Group cards by category with the same tab pills used on the Store page (Oil / Honey / Coffee Beans).
- Each tab shows only that category's products, mirroring the public Store layout.
- Quick ±1 / custom add-remove behavior unchanged.

---

## 3. Editable cards for staff (all categories)

Each stock card in the Kitchen dashboard gets an **Edit** button opening a modal with fields:
- Name
- Description
- Price (AED)
- Volume / Size
- Badge text
- Coming Soon (toggle)
- Image upload (reuses existing `admin-upload-url` edge function pattern)

Save writes directly to `store_products` (staff already has UPDATE policy).

**StorePage + ProductDetail refactor:**
- Replace `STORE_PRODUCTS` static array as the rendering source.
- Fetch all rows from `store_products` on mount; merge with existing `STORE_PRODUCTS` only as a fallback for olive-oil rows that haven't been migrated yet (keeps oil cards visually identical until staff edits them).
- `ProductDetail` reads name/description/price/volume/image/badge/coming_soon from DB row when present.
- "Coming Soon" flag controls the disabled CTA on `ProductDetail` (already hardcoded; will become dynamic).

---

## Technical notes

Files to add/modify:
```text
supabase migration              add columns + seed honey/beans rows
src/pages/StorePage.tsx         sessionStorage persistence + DB fetch
src/pages/ProductDetail.tsx     read full product from DB
src/data/storeCatalog.ts        keep as fallback only
src/components/kitchen/
  StockManager.tsx              category tabs + Edit button
  StoreCardEditModal.tsx        new — edit form with image upload
```

No changes to: cart, checkout, payment flow, or olive-oil hero copy.
