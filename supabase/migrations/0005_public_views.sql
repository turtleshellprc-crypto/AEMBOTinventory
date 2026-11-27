-- Public-facing inventory view. Runs with owner rights, so anonymous visitors can read
-- exactly these columns. supplier_url and notes are visible to signed-in members only.
-- Stage 2 replaces the hard-coded 0 allocated quantity with a real sum from `allocations`.
create view inventory_list as
select
  i.id, i.name, i.part_number, i.description,
  i.category_id, c.name as category_name,
  i.manufacturer, i.manufacturer_part_number, i.material, i.specifications, i.image_url,
  case when is_active_member() then i.supplier_url end as supplier_url,
  case when is_active_member() then i.notes end as notes,
  i.location_id, l.name as location_name,
  i.quantity_on_hand,
  0::numeric(12,3) as quantity_allocated,
  (i.quantity_on_hand - 0)::numeric(12,3) as quantity_available,
  i.min_stock_threshold, i.unit, i.source, i.fusion_document_id,
  i.archived_at, i.created_at, i.updated_at,
  case
    when i.quantity_on_hand = 0 then 'out'
    when i.min_stock_threshold > 0 and (i.quantity_on_hand - 0) < i.min_stock_threshold then 'low'
    else 'ok'
  end as stock_status
from inventory_items i
left join categories c on c.id = i.category_id
left join storage_locations l on l.id = i.location_id
where i.archived_at is null or is_active_member();
grant select on inventory_list to anon, authenticated;

revoke all on function my_permissions, has_permission, is_active_member from public;
grant execute on function my_permissions, has_permission, is_active_member to anon, authenticated;

-- Dashboard numbers computed in the database. Recent activity is members-only.
create function dashboard_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'unique_items', (select count(*) from inventory_items where archived_at is null),
    'total_quantity', (select coalesce(sum(quantity_on_hand),0) from inventory_items where archived_at is null),
    'total_allocated', 0,
    'total_available', (select coalesce(sum(quantity_on_hand),0) from inventory_items where archived_at is null),
    'low_count', (select count(*) from inventory_items where archived_at is null
                   and quantity_on_hand > 0 and min_stock_threshold > 0 and quantity_on_hand < min_stock_threshold),
    'zero_available_count', (select count(*) from inventory_items where archived_at is null and quantity_on_hand <= 0),
    'by_category', (select coalesce(jsonb_agg(x order by x.quantity desc), '[]'::jsonb) from (
        select coalesce(c.name,'Uncategorized') as name, count(*) as items, sum(i.quantity_on_hand) as quantity
        from inventory_items i left join categories c on c.id = i.category_id
        where i.archived_at is null group by 1) x),
    'low_items', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select id, name, part_number, quantity_on_hand, quantity_available, min_stock_threshold, unit, stock_status
        from inventory_list where archived_at is null and stock_status in ('low','out')
        order by quantity_available limit 10) x),
    'recent_activity', case when is_active_member() then (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select t.id, t.type, t.quantity_change, t.created_at, i.name as item_name, i.unit, p.display_name as user_name
        from inventory_transactions t join inventory_items i on i.id = t.item_id
        left join profiles p on p.id = t.user_id
        order by t.created_at desc limit 10) x) else '[]'::jsonb end
  );
$$;
grant execute on function dashboard_stats to anon, authenticated;
