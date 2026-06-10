## Export Plan

Generate downloadable files in `/mnt/documents/` containing every order from the beginning of the database, plus a calculator-style revenue summary.

### Files to produce

1. **`orders_all.csv`** — every row from `orders` (paid + pending + any other status), oldest to newest, with all customer-facing columns:
   - order_number, created_at, paid_at, payment_status, payment_method, payment_provider, payment_reference
   - customer_name, customer_phone, customer_email, customer_location, ip_address
   - order_type, subtotal, total_amount, applied_discount_code, code_discount_amount
   - notes, extra_notes, visitor_id, id

2. **`order_items.csv`** — every row from `order_items`, joined by `order_id` so each line item is traceable to its order.

3. **`orders_paid.csv`** — filtered view: `payment_status = 'paid'` only (what the Kitchen "Paid" tab shows).

4. **`orders_pending.csv`** — filtered view: `payment_status = 'pending'` only.

5. **`calculator_summary.csv`** — the same numbers the in-app Revenue Calculator computes from paid orders:
   - Today / Yesterday / This week / Last week / This month / Last month / All-time
   - For each bucket: order count, gross revenue (AED), average order value
   - Plus a daily breakdown (date, orders, revenue) for the last 90 days

### How

Run `psql` `COPY ... TO STDOUT WITH CSV HEADER` for files 1–4 (one shell call, parallel-safe since each writes a different file). For file 5, run a single SQL aggregation query and pipe to CSV.

All five files land in `/mnt/documents/` and are returned as `<presentation-artifact>` tags so you can download them directly from chat.

### Not included
- No schema/DDL (you already have the migration export).
- No edge-function code (already in the export).
- No storage objects (images).

If you also want `shared_payments`, `discount_codes`, or analytics tables (`page_views`, `site_events`, `visitor_sessions`) exported in the same batch, say the word and I'll add them — otherwise I'll stick to the 5 files above to keep credits low.