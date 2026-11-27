-- Permission catalogue (covers all stages), default roles, and authorization helpers.
insert into permissions (key, grp, description) values
 ('inventory.view','Inventory','View inventory'),
 ('inventory.add','Inventory','Add inventory items'),
 ('inventory.edit_details','Inventory','Edit inventory details, categories and locations'),
 ('inventory.edit_quantity','Inventory','Edit physical quantities'),
 ('inventory.archive','Inventory','Archive inventory items'),
 ('subsystems.view','Subsystems','View subsystems'),
 ('subsystems.create','Subsystems','Create subsystems'),
 ('subsystems.edit','Subsystems','Edit subsystems'),
 ('subsystems.archive','Subsystems','Archive subsystems'),
 ('subsystems.allocate','Subsystems','Allocate parts'),
 ('subsystems.return','Subsystems','Return allocations'),
 ('subsystems.consume','Subsystems','Mark parts as used'),
 ('subsystems.notes','Subsystems','Manage allocation notes'),
 ('fusion.view','Fusion','View imported parts'),
 ('fusion.import','Fusion','Run Fusion imports'),
 ('fusion.review','Fusion','Review imported parts'),
 ('fusion.approve','Fusion','Approve imported parts'),
 ('fusion.edit','Fusion','Edit Fusion-linked information'),
 ('team.view','Team','View team members'),
 ('team.invite','Team','Invite members'),
 ('team.assign_roles','Team','Assign roles'),
 ('team.deactivate','Team','Deactivate accounts'),
 ('team.create_roles','Team','Create roles'),
 ('team.edit_permissions','Team','Edit permissions'),
 ('admin.settings','Administration','Change website settings'),
 ('admin.database','Administration','Manage database-related settings'),
 ('admin.audit','Administration','View audit history'),
 ('admin.export','Administration','Export inventory data');

insert into roles (name, description, color, position, is_admin) values
 ('Administrator','Full access to everything','#C0392B',0,true),
 ('Inventory Manager','Manages parts, quantities and locations','#1D4ED8',1,false),
 ('Student','Can view inventory','#5B6773',2,false);

insert into role_permissions (role_id, permission_key)
select r.id, p.key from roles r, permissions p
where r.name = 'Inventory Manager'
  and p.key in ('inventory.view','inventory.add','inventory.edit_details','inventory.edit_quantity','inventory.archive','subsystems.view');
insert into role_permissions (role_id, permission_key)
select r.id, p.key from roles r, permissions p
where r.name = 'Student' and p.key in ('inventory.view','subsystems.view');

-- Effective permissions: admin roles hold everything and ignore overrides (cannot be locked out);
-- otherwise role permissions plus granted overrides, minus denied overrides.
create function my_permissions() returns text[]
language plpgsql stable security definer set search_path = public as $$
declare v text[];
begin
  if auth.uid() is null
     or not exists (select 1 from profiles where id = auth.uid() and is_active) then
    return '{}';
  end if;
  if exists (select 1 from user_roles ur join roles r on r.id = ur.role_id
             where ur.user_id = auth.uid() and r.is_admin) then
    select coalesce(array_agg(key), '{}') into v from permissions;
    return v;
  end if;
  select coalesce(array_agg(k), '{}') into v from (
    select rp.permission_key k from user_roles ur
      join role_permissions rp on rp.role_id = ur.role_id where ur.user_id = auth.uid()
    union
    select permission_key from user_permission_overrides where user_id = auth.uid() and granted
  ) s
  where k not in (select permission_key from user_permission_overrides
                  where user_id = auth.uid() and not granted);
  return v;
end $$;

create function has_permission(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select p = any (my_permissions());
$$;

create function is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active);
$$;

-- Invite-only: signups are disabled in Supabase, so every auth.users row comes from an invitation.
-- The first user becomes Administrator, everyone after that starts as Student.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_role uuid;
begin
  insert into profiles (id, email, display_name)
  values (new.id, new.email,
          coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)));
  if not exists (select 1 from user_roles ur join roles r on r.id = ur.role_id where r.is_admin) then
    select id into v_role from roles where is_admin limit 1;
  else
    select id into v_role from roles where name = 'Student';
  end if;
  insert into user_roles (user_id, role_id) values (new.id, v_role);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Last-administrator guard
create function guard_last_admin() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_other int;
begin
  if tg_table_name = 'user_roles' then
    if exists (select 1 from roles where id = old.role_id and is_admin) then
      select count(*) into v_other from user_roles ur
        join roles r on r.id = ur.role_id join profiles p on p.id = ur.user_id
        where r.is_admin and p.is_active and ur.user_id <> old.user_id;
      if v_other = 0 and exists (select 1 from profiles where id = old.user_id and is_active) then
        raise exception 'Cannot remove the last active administrator';
      end if;
    end if;
    return old;
  else
    if old.is_active and not new.is_active
       and exists (select 1 from user_roles ur join roles r on r.id = ur.role_id
                   where ur.user_id = old.id and r.is_admin) then
      select count(*) into v_other from user_roles ur
        join roles r on r.id = ur.role_id join profiles p on p.id = ur.user_id
        where r.is_admin and p.is_active and ur.user_id <> old.id;
      if v_other = 0 then raise exception 'Cannot deactivate the last active administrator'; end if;
    end if;
    return new;
  end if;
end $$;
create trigger user_roles_guard before delete on user_roles
  for each row execute function guard_last_admin();
create trigger profiles_guard before update of is_active on profiles
  for each row execute function guard_last_admin();
