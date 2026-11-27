-- Row Level Security. Anonymous visitors never touch the inventory base tables;
-- they read the restricted view created in 0005.
alter table profiles enable row level security;
alter table permissions enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table user_roles enable row level security;
alter table user_permission_overrides enable row level security;
alter table categories enable row level security;
alter table storage_locations enable row level security;
alter table inventory_items enable row level security;
alter table inventory_transactions enable row level security;

revoke all on all tables in schema public from anon, authenticated;

-- Team data: active members only
create policy profiles_read on profiles for select to authenticated using (is_active_member());
create policy permissions_read on permissions for select to authenticated using (is_active_member());
create policy roles_read on roles for select to authenticated using (is_active_member());
create policy role_permissions_read on role_permissions for select to authenticated using (is_active_member());
create policy user_roles_read on user_roles for select to authenticated using (is_active_member());
create policy overrides_read on user_permission_overrides for select to authenticated
  using (user_id = auth.uid() or has_permission('team.view'));
grant select on profiles, permissions, roles, role_permissions, user_roles, user_permission_overrides to authenticated;
-- Members may rename themselves; nothing else on profiles is client-writable
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
grant update (display_name) on profiles to authenticated;

-- Categories and locations: public read, permissioned write
create policy categories_read on categories for select to anon, authenticated using (true);
create policy categories_insert on categories for insert to authenticated with check (has_permission('inventory.edit_details'));
create policy categories_update on categories for update to authenticated
  using (has_permission('inventory.edit_details')) with check (has_permission('inventory.edit_details'));
create policy categories_delete on categories for delete to authenticated using (has_permission('inventory.edit_details'));
grant select on categories, storage_locations to anon;
grant select, insert, update, delete on categories, storage_locations to authenticated;

create policy locations_read on storage_locations for select to anon, authenticated using (true);
create policy locations_insert on storage_locations for insert to authenticated with check (has_permission('inventory.edit_details'));
create policy locations_update on storage_locations for update to authenticated
  using (has_permission('inventory.edit_details')) with check (has_permission('inventory.edit_details'));
create policy locations_delete on storage_locations for delete to authenticated using (has_permission('inventory.edit_details'));

-- Inventory items: members read the base table; writes need permissions.
-- quantity_on_hand is NOT updatable by clients, only through adjust_quantity().
create policy items_read on inventory_items for select to authenticated using (is_active_member());
create policy items_insert on inventory_items for insert to authenticated with check (has_permission('inventory.add'));
create policy items_update on inventory_items for update to authenticated
  using (has_permission('inventory.edit_details') or has_permission('inventory.archive'))
  with check (has_permission('inventory.edit_details') or has_permission('inventory.archive'));
grant select, insert on inventory_items to authenticated;
grant update (name, part_number, description, category_id, manufacturer, manufacturer_part_number,
              material, specifications, image_url, supplier_url, location_id, min_stock_threshold,
              unit, notes, archived_at) on inventory_items to authenticated;

-- Archive vs edit are separate permissions; enforce the split per changed column.
create function enforce_item_update_rules() returns trigger language plpgsql as $$
begin
  if new.archived_at is distinct from old.archived_at and not has_permission('inventory.archive') then
    raise exception 'You do not have permission to archive or restore items';
  end if;
  if (to_jsonb(new) - 'archived_at' - 'updated_at') is distinct from (to_jsonb(old) - 'archived_at' - 'updated_at')
     and not has_permission('inventory.edit_details') then
    raise exception 'You do not have permission to edit item details';
  end if;
  return new;
end $$;
create trigger inventory_items_rules before update on inventory_items
  for each row execute function enforce_item_update_rules();

-- History: members can read; nobody can write through the API
create policy transactions_read on inventory_transactions for select to authenticated using (is_active_member());
grant select on inventory_transactions to authenticated;
