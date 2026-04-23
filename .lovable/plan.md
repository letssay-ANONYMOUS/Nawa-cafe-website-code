
Update the initial loading overlay so the first brown screen shows the actual Nawa Café logo instead of the coffee emoji / broken placeholder.

What to change:
1. Fix the logo asset path in `src/components/PageLoaderOverlay.tsx`
   - The component currently uses `/nawacafe-logo.png`
   - The available public assets are `public/nawa-logo.png` and `public/nawa-logo.jpg`
   - Change the image source to `/nawa-logo.png` so the real logo loads correctly

2. Keep the existing loading animation behavior
   - Preserve the brown fullscreen background
   - Keep the animated progress bar
   - Keep the “NAWA CAFÉ” text unless you want logo-only branding later

3. Verify the initial-load flow still works as intended
   - `src/pages/Home.tsx` already mounts `PageLoaderOverlay`
   - `src/hooks/useInitialLoad.ts` already controls the one-time-per-session behavior
   - No logic changes are needed unless you want this loader on pages beyond the homepage

Technical details:
- File to edit: `src/components/PageLoaderOverlay.tsx`
- Exact fix: replace `src="/nawacafe-logo.png"` with `src="/nawa-logo.png"`
- No backend or database changes required

Expected result:
- On the very first brown loading screen, users will see the Nawa Café logo instead of the current incorrect icon/placeholder
- The rest of the loading animation remains unchanged
