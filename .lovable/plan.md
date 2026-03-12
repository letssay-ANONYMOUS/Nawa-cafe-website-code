

## Problem

Two race conditions cause the kitchen login to intermittently fail or loop:

**Race 1 — Double navigation in StaffLogin:**
When `handleLogin` calls `signInWithPassword`, it triggers the `SIGNED_IN` auth event. Both `handleLogin` AND the `onAuthStateChange` listener then race to check the role and navigate to `/admin/kitchen` simultaneously. This causes double role-checks and double navigations.

**Race 2 — One-shot `authResolved` flag in KitchenAuthGate:**
When the gate mounts, both `getSession()` and `onAuthStateChange(INITIAL_SESSION)` fire near-simultaneously. The `authResolved` flag means whichever resolves first wins — if `getSession` returns before the session is fully restored (returning null), it redirects to login and locks out the `SIGNED_IN` event that arrives moments later. On re-login, this creates the refresh loop.

**Race 3 — Awaiting inside `onAuthStateChange`:**
Per Supabase docs, awaiting async operations inside `onAuthStateChange` can block subsequent auth event processing, causing deadlocks.

## Plan

### 1. Rewrite StaffLogin — remove auth listener entirely

- Remove `onAuthStateChange` subscription and the `routeIfAuthorized` useEffect
- On mount: call `getSession()` → if session exists and has role, redirect. Otherwise show form. Simple, no listener.
- On form submit: `signInWithPassword` → check role → navigate. Single path, no races.

### 2. Rewrite KitchenAuthGate — remove one-shot flag, avoid awaiting in listener

- Remove the `authResolved` one-shot flag
- Use `getSession()` as the primary session restore mechanism
- In `onAuthStateChange`: do NOT await. Use `setTimeout(0, () => validateSessionAccess(...))` to defer without blocking auth event processing
- Allow state to be re-set on subsequent `SIGNED_IN` events (no one-shot blocking)
- Keep the safety timeout but make it clearable on success
- On `SIGNED_OUT`: reset state and redirect immediately

### Files changed
- `src/components/KitchenAuthGate.tsx`
- `src/pages/StaffLogin.tsx`

