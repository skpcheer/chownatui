-- CHOWNATUI v2.9.2 — Layout + Role Fix
-- Safe patch for an existing v2.9.2 database.
-- IMPORTANT: this patch matches the existing layout_configs schema:
--   id, target, config, updated_at, updated_by
-- It does NOT create/use a `key` column.
-- It does NOT drop tables or delete member/attendance data.

-- 1) Custom fields required by the app.
alter table public.profiles
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

alter table public.checkin_members
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

-- 2) Layout permission helper.
create or replace function public.can_manage_layout()
returns boolean
language sql stable security definer set search_path=public as $$
  select public.current_role() in ('head','teacher','deputy');
$$;

-- 3) Make sure heads/teachers can update other profiles.
drop policy if exists "head manages profiles" on public.profiles;
create policy "head manages profiles"
on public.profiles
for update to authenticated
using (public.is_head())
with check (public.is_head());

-- 4) Reliable server-side role assignment.
-- Only head/teacher may call this function.
-- Built-in roles: member, deputy, head, teacher.
-- Custom roles are stored as role=member + custom_role_id.
create or replace function public.set_member_role(
  target_user_id uuid,
  new_role text,
  new_custom_role_id uuid default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_head() then
    raise exception 'Only head/teacher can change roles';
  end if;

  if new_role not in ('member','deputy','head','teacher') then
    raise exception 'Invalid role';
  end if;

  if new_custom_role_id is not null then
    if new_role <> 'member' then
      raise exception 'Custom role must use member system role';
    end if;

    if not exists (
      select 1
      from public.custom_roles
      where id = new_custom_role_id
    ) then
      raise exception 'Custom role not found';
    end if;
  end if;

  update public.profiles
  set role = new_role,
      custom_role_id = new_custom_role_id
  where id = target_user_id;

  if not found then
    raise exception 'Member not found';
  end if;
end;
$$;

revoke execute on function public.set_member_role(uuid,text,uuid) from public;
grant execute on function public.set_member_role(uuid,text,uuid) to authenticated;

-- 5) Layout table: keep the existing target-based schema.
create table if not exists public.layout_configs(
  id uuid primary key default gen_random_uuid(),
  target text not null unique check(target in ('members','checkin')),
  config jsonb not null default '{"fields":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.layout_configs enable row level security;
drop policy if exists "layout configs read" on public.layout_configs;
drop policy if exists "layout configs manage" on public.layout_configs;
create policy "layout configs read"
on public.layout_configs
for select to authenticated
using (true);
create policy "layout configs manage"
on public.layout_configs
for all to authenticated
using (public.can_manage_layout())
with check (public.can_manage_layout());

-- 6) Seed/repair the two layout previews using the exact field format
-- consumed by the v2.9.2 UI (id/x/y/w/h/visible).
-- Only replace configs that still use the old key/order/area format.
do $$
declare
  has_new_members boolean;
  has_new_checkin boolean;
begin
  select exists (
    select 1
    from jsonb_array_elements(coalesce(config->'fields','[]'::jsonb)) f
    where f ? 'id'
  ) into has_new_members
  from public.layout_configs where target='members';

  if not coalesce(has_new_members,false) then
    insert into public.layout_configs(target,config)
    values ('members','{"fields":[
      {"id":"identity","label":"ชื่อ / ตำแหน่ง","x":1,"y":1,"w":7,"h":1,"visible":true},
      {"id":"avatar","label":"รูปโปรไฟล์","x":9,"y":1,"w":3,"h":3,"visible":true},
      {"id":"bio","label":"แนะนำตัว","x":1,"y":2,"w":8,"h":1,"visible":true},
      {"id":"basic","label":"ชั้น · ชื่อเล่น · วันเกิด","x":1,"y":3,"w":11,"h":1,"visible":true},
      {"id":"date","label":"วันที่","x":1,"y":4,"w":5,"h":1,"visible":true},
      {"id":"availability","label":"เวลาว่าง","x":6,"y":4,"w":6,"h":1,"visible":true}
    ]}'::jsonb)
    on conflict(target) do update set config=excluded.config, updated_at=now();
  end if;

  select exists (
    select 1
    from jsonb_array_elements(coalesce(config->'fields','[]'::jsonb)) f
    where f ? 'id'
  ) into has_new_checkin
  from public.layout_configs where target='checkin';

  if not coalesce(has_new_checkin,false) then
    insert into public.layout_configs(target,config)
    values ('checkin','{"fields":[
      {"id":"full_name","label":"ชื่อ-สกุล","x":1,"y":1,"w":5,"h":1,"visible":true},
      {"id":"nickname","label":"ชื่อเล่น","x":6,"y":1,"w":3,"h":1,"visible":true},
      {"id":"class_name","label":"ชั้น","x":9,"y":1,"w":2,"h":1,"visible":true},
      {"id":"team","label":"ฝ่าย","x":11,"y":1,"w":2,"h":1,"visible":true},
      {"id":"sort_no","label":"ลำดับ","x":1,"y":2,"w":2,"h":1,"visible":true},
      {"id":"show_in_checkin","label":"แสดงในเช็คชื่อ","x":3,"y":2,"w":4,"h":1,"visible":true}
    ]}'::jsonb)
    on conflict(target) do update set config=excluded.config, updated_at=now();
  end if;
end $$;

-- DONE
