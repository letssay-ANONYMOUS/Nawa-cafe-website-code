## Goal
Let staff pick the card number when creating or editing a card. If the chosen number is already taken, shift that card and every following one up by 1 so nothing is overwritten and the menu order stays clean.

## Changes

### 1. `AdminCardModal.tsx` (staff-facing form)
- Add a "Card Number" input (numeric, required).
- On Create: pre-fill with the next free number in the card's section, but allow override.
- On Edit: pre-fill with the current `id`, allow change.
- Validate: integer ≥ 1, not equal to another card unless shift is allowed.

### 2. New backend logic — Supabase RPC `insert_card_at_position` and `move_card_to_position`
Two `SECURITY DEFINER` Postgres functions on `menu_cards`:

- **`insert_card_at_position(target_id int, payload jsonb)`**
  1. If `target_id` is occupied → shift every row with `id >= target_id` up by 1 (descending order, temp offset to avoid PK collisions).
  2. Insert the new card with `id = target_id`.

- **`move_card_to_position(old_id int, new_id int)`**
  1. If `new_id` free → simple `UPDATE id = new_id`.
  2. If occupied → temp-park the moving row, shift the affected range by ±1, drop it back at `new_id`.

Both run in a single transaction so numbering can never end up duplicated or broken.

### 3. `MenuCardsManager.tsx` / create + edit handlers
- Replace direct `insert` / `update` on `menu_cards` with calls to the two RPCs.
- Invalidate the `menu-cards` query so the menu page reflects new numbering immediately.

### 4. No frontend menu changes needed
`useMenuCards` already sorts by `id`, and `MenuItemDetail` already uses the visual order — once IDs are correct, navigation, price, and section all line up automatically.

## Notes on the existing Nawa Eggs card (id 200)
After the new system ships, staff can simply edit that card and set its number to 19. The RPC will shift nothing (19 is free in Breakfast) and the card will land in its correct position with working arrows.

## Out of scope
- No changes to image handling (already JPEG via `menu-images` bucket).
- No changes to section ranges in `menuSections` — the shift logic is section-agnostic and works across the full 1–999 ID space.
