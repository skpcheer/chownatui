-- CHOWNATUI v2.9.2 — COMPLETE FIXED MIGRATION
-- Includes custom_fields + layout_configs required by the v2.9.2 app.
-- Run AFTER migration-v29-1-event-colors.sql and previous migrations.
-- Idempotent: safe to re-run if some v2.9.2 policies already exist.

-- 1) Check-in master data
alter table public.checkin_members
  add column if not exists show_in_checkin boolean not null default true;
alter table public.checkin_members
  add column if not exists avatar_scale numeric not null default 1;
alter table public.checkin_members
  add column if not exists avatar_x numeric not null default 0;
alter table public.checkin_members
  add column if not exists avatar_y numeric not null default 0;
alter table public.checkin_members
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

alter table public.profiles
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

update public.checkin_members
set show_in_checkin = true
where show_in_checkin is null;

-- 2) Layout configuration.
create table if not exists public.layout_configs(
  id uuid primary key default gen_random_uuid(),
  target text not null unique check(target in ('members','checkin')),
  config jsonb not null default '{"fields":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.layout_configs(target,config)
values
('members','{"fields":[
 {"key":"display_name","label":"ชื่อที่แสดง","visible":true,"order":0,"area":"main","builtin":true},
 {"key":"full_name","label":"ชื่อ-สกุล","visible":true,"order":1,"area":"main","builtin":true},
 {"key":"bio","label":"แนะนำตัว","visible":true,"order":2,"area":"main","builtin":true},
 {"key":"position","label":"ตำแหน่ง","visible":true,"order":3,"area":"right","builtin":true},
 {"key":"team","label":"ฝ่าย","visible":true,"order":4,"area":"right","builtin":true},
 {"key":"class_name","label":"ชั้น","visible":true,"order":5,"area":"right","builtin":true},
 {"key":"nickname","label":"ชื่อเล่น","visible":true,"order":6,"area":"right","builtin":true},
 {"key":"birthday","label":"วันเกิด","visible":true,"order":7,"area":"right","builtin":true}
]}'),
('checkin','{"fields":[
 {"key":"full_name","label":"ชื่อ-สกุล","visible":true,"order":0,"area":"main","builtin":true},
 {"key":"class_name","label":"ชั้น","visible":true,"order":1,"area":"main","builtin":true},
 {"key":"nickname","label":"ชื่อเล่น","visible":true,"order":2,"area":"main","builtin":true},
 {"key":"team","label":"ฝ่าย","visible":true,"order":3,"area":"main","builtin":true},
 {"key":"avatar_url","label":"รูปภาพ","visible":true,"order":4,"area":"main","builtin":true},
 {"key":"linked_user_id","label":"บัญชีเว็บไซต์","visible":false,"order":5,"area":"main","builtin":true}
]}')
on conflict(target) do nothing;

-- 3) Permission helpers: only head/teacher/deputy can manage master/member data.
create or replace function public.is_head()
returns boolean
language sql stable security definer set search_path=public as $$
  select public.current_role() in ('head','teacher');
$$;

create or replace function public.is_deputy_or_head()
returns boolean
language sql stable security definer set search_path=public as $$
  select public.current_role() in ('head','teacher','deputy');
$$;

create or replace function public.can_manage_work()
returns boolean
language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.profiles p
    where p.id=auth.uid()
      and (
        p.role in ('head','teacher','deputy')
        or p.department_position in (
          'ประธานเชียร์','รองประธานเชียร์',
          'ประธานฝ่ายโค้ด','รองประธานฝ่ายโค้ด',
          'ประธานฝ่ายเทคนิค','รองประธานฝ่ายเทคนิค',
          'ประธานฝ่ายอุปกรณ์','รองประธานฝ่ายอุปกรณ์',
          'ประธานฝ่ายโลจิสติกส์','รองประธานฝ่ายโลจิสติกส์',
          'ประธานฝ่ายลีดเดอร์','รองประธานลีดเดอร์'
        )
      )
  );
$$;

create or replace function public.can_manage_layout()
returns boolean
language sql stable security definer set search_path=public as $$
  select public.current_role() in ('head','teacher','deputy');
$$;

-- 4) Role assignment protection.
create or replace function public.prevent_non_head_role_change()
returns trigger
language plpgsql
security definer
set search_path=public as $$
begin
  if (old.role is distinct from new.role
      or old.custom_role_id is distinct from new.custom_role_id
      or old.department_position is distinct from new.department_position)
     and not public.is_head() then
    raise exception 'Only head/teacher can change roles or department positions';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute function public.prevent_non_head_role_change();

-- 5) Work permissions. Drop both underscore and space variants because
-- earlier v2.9.2 drafts used different policy names.
drop policy if exists "appointments manage" on public.appointments;
drop policy if exists "plans manage" on public.plans;
drop policy if exists "plan topics manage" on public.plan_topics;
drop policy if exists "plan_topics manage" on public.plan_topics;
drop policy if exists "plan members manage" on public.plan_members;
drop policy if exists "plan_members manage" on public.plan_members;
drop policy if exists "plan duties manage" on public.plan_duties;
drop policy if exists "plan_duties manage" on public.plan_duties;
drop policy if exists "plan slots manage" on public.plan_slots;
drop policy if exists "plan_slots manage" on public.plan_slots;
drop policy if exists "attendance manage" on public.attendance;
drop policy if exists "checkin manage" on public.checkin_members;

create policy "appointments manage" on public.appointments
  for all to authenticated using(public.can_manage_work()) with check(public.can_manage_work());
create policy "plans manage" on public.plans
  for all to authenticated using(public.can_manage_work()) with check(public.can_manage_work());
create policy "plan topics manage" on public.plan_topics
  for all to authenticated using(public.can_manage_work()) with check(public.can_manage_work());
create policy "plan members manage" on public.plan_members
  for all to authenticated using(public.can_manage_work()) with check(public.can_manage_work());
create policy "plan duties manage" on public.plan_duties
  for all to authenticated using(public.can_manage_work()) with check(public.can_manage_work());
create policy "plan slots manage" on public.plan_slots
  for all to authenticated using(public.can_manage_work()) with check(public.can_manage_work());
create policy "attendance manage" on public.attendance
  for all to authenticated using(public.can_manage_work()) with check(public.can_manage_work());
create policy "checkin manage" on public.checkin_members
  for all to authenticated using(public.is_deputy_or_head()) with check(public.is_deputy_or_head());

-- 6) Announcement permissions.
drop policy if exists "announcements manage deputy" on public.announcements;
drop policy if exists "announcements manage work" on public.announcements;
create policy "announcements manage work" on public.announcements
  for all to authenticated using(public.can_manage_work()) with check(public.can_manage_work());

-- 7) Check-in avatar storage permissions.
drop policy if exists "checkin avatar manage" on storage.objects;
create policy "checkin avatar manage" on storage.objects
  for all to authenticated
  using(bucket_id='checkin-avatars' and public.is_deputy_or_head())
  with check(bucket_id='checkin-avatars' and public.is_deputy_or_head());

-- 8) Announcement image uploads.
drop policy if exists "announcement images manager write" on storage.objects;
drop policy if exists "announcement images manager delete" on storage.objects;
create policy "announcement images manager write" on storage.objects
  for insert to authenticated
  with check(bucket_id='announcement-images' and public.can_manage_work());
create policy "announcement images manager delete" on storage.objects
  for delete to authenticated
  using(bucket_id='announcement-images' and public.can_manage_work());

-- 9) Layout permissions.
alter table public.layout_configs enable row level security;
drop policy if exists "layout configs read" on public.layout_configs;
drop policy if exists "layout configs manage" on public.layout_configs;
create policy "layout configs read" on public.layout_configs
  for select to authenticated using(true);
create policy "layout configs manage" on public.layout_configs
  for all to authenticated
  using(public.can_manage_layout())
  with check(public.can_manage_layout());

-- 10) Safe server-side reordering for the check-in master list.
create or replace function public.reorder_checkin_members(member_ids uuid[])
returns void
language plpgsql
security definer
set search_path=public as $$
declare
  i integer;
  member_id uuid;
begin
  if not public.is_deputy_or_head() then
    raise exception 'Not allowed';
  end if;
  if member_ids is null or array_length(member_ids,1) is null then
    return;
  end if;
  if (select count(*) from unnest(member_ids)) <> (select count(*) from public.checkin_members where id = any(member_ids)) then
    raise exception 'Invalid member list';
  end if;
  i := 1;
  foreach member_id in array member_ids loop
    update public.checkin_members c set sort_no = -i where c.id=member_id;
    i := i + 1;
  end loop;
  i := 1;
  foreach member_id in array member_ids loop
    update public.checkin_members c set sort_no = i where c.id=member_id;
    i := i + 1;
  end loop;
end;
$$;

create index if not exists checkin_members_sort_idx on public.checkin_members(sort_no);
