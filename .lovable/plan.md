

## Plan: Remove Duplicate Croissants & Move Egg/Feta to Croissants Section

### What's happening

**IDs 20 & 21** (Plain Croissant, Mix Cheese Croissant) are duplicates of IDs 158 & 159 in the Croissants section. They need to be deleted.

**IDs 22 & 23** (Feta Cheese Croissant, Egg Croissant) need to move from Breakfast to the Croissants section. Since the menu uses contiguous ID ranges, we'll delete them from the current position and re-insert them as IDs 168 & 169.

### Database changes (using insert/delete tool, not migration)

1. **Delete IDs 20, 21** — remove duplicate croissants from Breakfast
2. **Delete IDs 22, 23** — remove from Breakfast (will re-insert at bottom of Croissants)
3. **Insert ID 168** — Feta Cheese Croissant (AED 25.00, same image)
4. **Insert ID 169** — Egg Croissant (AED 32.00, same image)

### Code change: `src/hooks/useMenuCards.ts`

Update section ranges:
- **NAWA Breakfast**: endId `23` → `19`
- **Croissants & Bakery**: endId `165` → `169` (now includes cookies 166-167 and the moved croissants 168-169)
- **Remove** the standalone `Cookies` section (IDs 166-167 are now absorbed into Croissants & Bakery)

### No other files change. Zero kitchen impact.

