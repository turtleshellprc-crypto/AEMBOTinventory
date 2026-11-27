-- AEMBOT 6443 Inventory, Stage 1: core schema
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table permissions (
  key text primary key,
  grp text not null,
  description text not null
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text not null default '#5B6773',
  position int not null default 0,
  is_admin boolean not null default false,   -- admin roles implicitly hold every permission
  created_at timestamptz not null default now()
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

create table user_roles (
  user_id uuid not null references profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table user_permission_overrides (
  user_id uuid not null references profiles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  granted boolean not null,
  primary key (user_id, permission_key)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table storage_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  parent_id uuid references storage_locations(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);
create unique index storage_locations_unique_name
  on storage_locations (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  part_number text,
  description text,
  category_id uuid references categories(id) on delete restrict,
  manufacturer text,
  manufacturer_part_number text,
  material text,
  specifications text,
  image_url text,
  supplier_url text,
  location_id uuid references storage_locations(id) on delete restrict,
  quantity_on_hand numeric(12,3) not null default 0 check (quantity_on_hand >= 0),
  min_stock_threshold numeric(12,3) not null default 0 check (min_stock_threshold >= 0),
  unit text not null default 'each',
  source text not null default 'manual' check (source in ('manual','fusion','csv')),
  fusion_document_id text,
  fusion_component_id text,
  notes text,
  archived_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index inventory_items_part_number_unique
  on inventory_items (lower(part_number)) where part_number is not null and part_number <> '';
create index inventory_items_name_trgm on inventory_items using gin (name gin_trgm_ops);
create index inventory_items_pn_trgm on inventory_items using gin (part_number gin_trgm_ops);
create index inventory_items_mpn_trgm on inventory_items using gin (manufacturer_part_number gin_trgm_ops);
create index inventory_items_desc_trgm on inventory_items using gin (description gin_trgm_ops);
create index inventory_items_category on inventory_items (category_id);
create index inventory_items_location on inventory_items (location_id);

-- Append-only history. No client policy allows insert, update or delete.
create table inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id) on delete restrict,
  type text not null check (type in ('initial','count','received','damaged','correction')),
  previous_quantity numeric(12,3) not null,
  new_quantity numeric(12,3) not null,
  quantity_change numeric(12,3) generated always as (new_quantity - previous_quantity) stored,
  user_id uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now()
);
create index inventory_transactions_item on inventory_transactions (item_id, created_at desc);
create index inventory_transactions_created on inventory_transactions (created_at desc);

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger inventory_items_touch before update on inventory_items
  for each row execute function touch_updated_at();
