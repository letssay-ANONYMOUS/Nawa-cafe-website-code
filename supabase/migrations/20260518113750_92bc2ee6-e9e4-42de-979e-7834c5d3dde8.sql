-- Prevent edits to shared_payments cart/total/etc. Only allow setting paid_order_id from NULL.
CREATE OR REPLACE FUNCTION public.protect_shared_payments_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cart IS DISTINCT FROM OLD.cart
     OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.total IS DISTINCT FROM OLD.total
     OR NEW.sender_name IS DISTINCT FROM OLD.sender_name
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'Only paid_order_id can be updated on shared_payments';
  END IF;

  IF OLD.paid_order_id IS NOT NULL
     AND NEW.paid_order_id IS DISTINCT FROM OLD.paid_order_id
  THEN
    RAISE EXCEPTION 'paid_order_id is already set and cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_shared_payments_update_trg ON public.shared_payments;
CREATE TRIGGER protect_shared_payments_update_trg
BEFORE UPDATE ON public.shared_payments
FOR EACH ROW EXECUTE FUNCTION public.protect_shared_payments_update();