-- Initial-quantity history row for new items
create function log_initial_quantity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into inventory_transactions (item_id, type, previous_quantity, new_quantity, user_id, notes)
  values (new.id, 'initial', 0, new.quantity_on_hand, auth.uid(), 'Item created');
  return new;
end $$;
create trigger inventory_items_initial_tx after insert on inventory_items
  for each row execute function log_initial_quantity();

create function set_created_by() returns trigger language plpgsql as $$
begin new.created_by = auth.uid(); return new; end $$;
create trigger inventory_items_created_by before insert on inventory_items
  for each row execute function set_created_by();

-- Atomic quantity change. Locks the row, validates against the latest value, writes history.
--   p_new_quantity: set the count to an absolute value (optionally pass p_expected for
--                   optimistic concurrency: fails if someone else changed it first)
--   p_delta:        add (positive) or remove (negative)
-- Exactly one of p_new_quantity / p_delta must be given.
create function adjust_quantity(
  p_item_id uuid,
  p_new_quantity numeric default null,
  p_delta numeric default null,
  p_type text default 'correction',
  p_notes text default null,
  p_expected numeric default null
) returns numeric
language plpgsql security definer set search_path = public as $$
declare v_prev numeric; v_new numeric;
begin
  if not has_permission('inventory.edit_quantity') then
    raise exception 'You do not have permission to edit quantities';
  end if;
  if (p_new_quantity is null) = (p_delta is null) then
    raise exception 'Provide either a new quantity or a change amount';
  end if;
  if p_type not in ('count','received','damaged','correction') then
    raise exception 'Invalid transaction type';
  end if;

  select quantity_on_hand into v_prev from inventory_items where id = p_item_id for update;
  if not found then raise exception 'Item not found'; end if;

  if p_expected is not null and p_expected <> v_prev then
    raise exception 'Quantity changed to % while you were editing. Reload and try again.', v_prev
      using errcode = '40001';
  end if;

  v_new := coalesce(p_new_quantity, v_prev + p_delta);
  if v_new < 0 then
    raise exception 'Quantity cannot go below zero (current: %)', v_prev;
  end if;
  if v_new = v_prev then
    raise exception 'Quantity is unchanged';
  end if;

  update inventory_items set quantity_on_hand = v_new where id = p_item_id;
  insert into inventory_transactions (item_id, type, previous_quantity, new_quantity, user_id, notes)
  values (p_item_id, p_type, v_prev, v_new, auth.uid(), p_notes);
  return v_new;
end $$;
revoke all on function adjust_quantity from public, anon;
grant execute on function adjust_quantity to authenticated;
