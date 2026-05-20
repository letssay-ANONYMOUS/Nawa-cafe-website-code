CREATE OR REPLACE FUNCTION public.delete_menu_card(_target_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _target_id IS NULL OR _target_id < 1 THEN
    RAISE EXCEPTION 'Invalid id';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.menu_cards WHERE id = _target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card % not found', _target_id;
  END IF;

  -- Shift all following cards down by 1
  UPDATE public.menu_cards SET id = id + 1000000 WHERE id > _target_id;
  UPDATE public.menu_cards SET id = id - 1000000 - 1 WHERE id > _target_id + 1000000;
END;
$function$;