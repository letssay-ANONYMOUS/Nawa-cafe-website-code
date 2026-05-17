CREATE TABLE public.shared_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart jsonb NOT NULL,
  sender_name text,
  notes text,
  subtotal numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_order_id uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create shared payments"
  ON public.shared_payments FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view shared payments"
  ON public.shared_payments FOR SELECT TO public
  USING (true);

CREATE POLICY "Anyone can update shared payments"
  ON public.shared_payments FOR UPDATE TO public
  USING (true) WITH CHECK (true);