
-- RPC: insert a new menu card at a specific id, shifting existing cards up if occupied
CREATE OR REPLACE FUNCTION public.insert_menu_card_at(
  _target_id integer,
  _name text,
  _price text,
  _description text,
  _image_url text,
  _section text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exists boolean;
BEGIN
  IF _target_id IS NULL OR _target_id < 1 THEN
    RAISE EXCEPTION 'Invalid target id';
  END IF;

  -- Permission: only admin or staff
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.menu_cards WHERE id = _target_id) INTO _exists;

  IF _exists THEN
    -- Park affected rows into a temporary high range to avoid PK collision
    UPDATE public.menu_cards SET id = id + 1000000 WHERE id >= _target_id;
    -- Shift them back up by 1
    UPDATE public.menu_cards SET id = id - 1000000 + 1 WHERE id >= _target_id + 1000000;
  END IF;

  INSERT INTO public.menu_cards (id, name, price, description, image_url, section)
  VALUES (_target_id, _name, _price, _description, _image_url, _section);

  RETURN _target_id;
END;
$$;

-- RPC: move an existing card to a new id, shifting others if needed
CREATE OR REPLACE FUNCTION public.move_menu_card(
  _old_id integer,
  _new_id integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exists boolean;
BEGIN
  IF _old_id IS NULL OR _new_id IS NULL OR _new_id < 1 THEN
    RAISE EXCEPTION 'Invalid id';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _old_id = _new_id THEN
    RETURN _new_id;
  END IF;

  -- Park the moving row
  UPDATE public.menu_cards SET id = -1 WHERE id = _old_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source card % not found', _old_id;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.menu_cards WHERE id = _new_id) INTO _exists;

  IF _exists THEN
    IF _new_id < _old_id THEN
      -- Shift rows in [_new_id, _old_id-1] up by 1 (descending to avoid collisions)
      UPDATE public.menu_cards SET id = id + 1000000
        WHERE id >= _new_id AND id < _old_id;
      UPDATE public.menu_cards SET id = id - 1000000 + 1
        WHERE id >= _new_id + 1000000 AND id < _old_id + 1000000;
    ELSE
      -- Shift rows in (_old_id, _new_id] down by 1
      UPDATE public.menu_cards SET id = id + 1000000
        WHERE id > _old_id AND id <= _new_id;
      UPDATE public.menu_cards SET id = id - 1000000 - 1
        WHERE id > _old_id + 1000000 AND id <= _new_id + 1000000;
    END IF;
  END IF;

  -- Drop the parked row at the new id
  UPDATE public.menu_cards SET id = _new_id WHERE id = -1;

  RETURN _new_id;
END;
$$;
