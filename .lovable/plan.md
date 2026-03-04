

## Problem

The kitchen dashboard's realtime UPDATE handler (lines 279-289 in `KitchenDashboard.tsx`) is **commented out** — it was disabled for testing purposes. This means when a customer pays and the order transitions from `pending` → `paid`, the kitchen gets no alert sound.

Currently, the alert only fires on new `pending` order INSERTs (the testing behavior).

## Plan

### 1. Fix the realtime UPDATE handler in `KitchenDashboard.tsx`

**Uncomment and re-enable** the UPDATE subscription handler (lines 279-289) so that when an order's `payment_status` changes to `paid`, it:
- Adds the order to `unacknowledgedOrders` (triggering the ringing alert)
- Switches the view to "paid"
- Shows a toast notification

**Remove** the alert trigger from the INSERT pending handler (line 248) — pending orders should appear silently. The ringing should only start when payment is confirmed.

The updated logic:

- **INSERT (pending)**: Add order to state, switch to pending view, show a quiet toast. No alert sound.
- **UPDATE (pending → paid)**: Add order to `unacknowledgedOrders` (triggers ringing), switch to paid view, show a loud toast.

### 2. Verify the end-to-end flow

The existing infrastructure already supports this:
- `create-ziina-checkout` creates the order with `pending` status → triggers INSERT event → kitchen sees it
- `verify-ziina-payment` updates order to `paid` → triggers UPDATE event → kitchen alert rings
- Realtime is already enabled on the `orders` table
- The `useKitchenAlert` hook handles continuous looping sound

No database changes needed. Only `KitchenDashboard.tsx` needs editing.

