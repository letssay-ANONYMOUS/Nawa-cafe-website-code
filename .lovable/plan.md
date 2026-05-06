# Store cards: smooth image animation, fix detail-page back glitch, restore Coming Soon on oil

Three small fixes scoped to the Store experience.

---

## 1. Smooth top-to-bottom image reveal (no stutter)

**Cause:** `<img>` currently uses `loading="eager"` + `fetchPriority="high"` for every card and animates via `grayscale opacity-70` directly on the raw element. With many images forced to load at once, decoding blocks the main thread and the cards pop in unevenly.

**Fix in `src/components/StoreProductCard.tsx`:**
- Switch to `loading="lazy"` + `decoding="async"` (drop `fetchPriority="high"`) so images decode off the main thread and only when near viewport.
- Add a local `loaded` state; render the `<img>` with `opacity-0` until `onLoad` fires, then animate from `translateY(-12px)` → `translateY(0)` with `opacity 0 → 1` over ~600ms ease-out (smooth top-to-bottom slide).
- Wrap image in a sized container (already there: `aspect-[4/3] sm:h-64`) so layout is reserved before the image arrives — no layout shift / stutter even on slow connections.
- Move the `grayscale opacity-70` look (used when `comingSoon`) onto a CSS class applied after load, so the greyscale filter doesn't repaint mid-transition.

**Add keyframe to `src/index.css`:**
```css
@keyframes store-img-reveal {
  0%   { opacity: 0; transform: translateY(-12px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

---

## 2. Fix back-navigation glitch on store cards

**Cause:** Back arrow on `ProductDetail` calls `navigate(-1)`, which remounts `StorePage`. The page now restores scroll inside `useLayoutEffect`, but it runs **before** product images finish loading, so the page jumps to a Y position that shrinks moments later → the visible "glitch" / flash.

**Fix in `src/pages/StorePage.tsx`:**
- Disable browser's automatic `history.scrollRestoration` on this page (`'manual'`).
- Defer the scroll restore until after the product list has rendered AND first batch of images has either loaded or errored. Use a small `Promise.all` over the visible images' `decode()` calls with a 400ms timeout fallback, then `window.scrollTo({ top: y, behavior: 'instant' })`.
- Save `scrollY` only on `beforeunload` / `visibilitychange` and on a router `popstate` listener — not in cleanup (which runs after layout already shifted on hot reload).

**Fix in `src/pages/ProductDetail.tsx`:**
- On mount, `window.scrollTo(0, 0)` instantly (no smooth) so the detail page doesn't briefly show the previous scroll offset before re-paint.

---

## 3. Restore "Coming Soon" on oil cards

**Cause:** During the previous DB migration the oil rows were inserted with `coming_soon = false` (default) while honey/beans got `true`. The card overlay & greyscale are now gated on `product.comingSoon`, so oil lost the badge.

**Fix:** Run a one-line database update setting `coming_soon = true` for every row where `category = 'oil'`. The overlay and greyscale will return immediately.

```sql
UPDATE public.store_products SET coming_soon = true WHERE category = 'oil';
```

---

## Files touched

```text
src/components/StoreProductCard.tsx   image lazy-load + reveal animation
src/index.css                          @keyframes store-img-reveal
src/pages/StorePage.tsx                deferred scroll restore, manual scrollRestoration
src/pages/ProductDetail.tsx            scroll-to-top on mount
db migration                           UPDATE store_products SET coming_soon=true WHERE category='oil'
```

No changes to data fetching, cart, or the Kitchen edit modal.
