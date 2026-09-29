-- CHOWNATUI v2.9.2
-- Safe re-runnable migration
-- Run AFTER migration-v29-1-event-colors.sql and previous migrations.
-- This version explicitly drops policies before recreating them to avoid
-- duplicate-policy errors when a previous partial migration already ran.

-- =========================================================
-- 1) CHECK-IN MASTER DATA
-- =========================================================

alter table public.checkin_members
  add column if not exists show_in_checkin boolean not null default true;

alter table public.checkin_members
  add column if not exists avatar_scale numeric not null default 1;

alter table public.checkin_members
  add column if not exists avatar_x numeric not null default 0;

alter table public.checkin_members
  add column if not exists avatar_y numeric not null default 0;

update public.checkin_members
set show_in_checkin = true
where show_in_checkin is null;


-- =========================================================
-- 2) PERMISSION HELPERS
-- Head + teacher = full admin for role/position changes.
-- Deputy + listed department positions = work management.
-- =========================================================

create or replace function public.is_head()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.current_role() in ('head','teacher');
$$;

create or replace function public.is_deputy_or_head()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.current_role() in ('head','teacher','deputy');
$$;

create or replace function public.can_manage_work()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('head','teacher','deputy')
        or p.department_position in (
          'ประธานเชียร์',
          'รองประธานเชียร์',
          'ประธานฝ่ายโค้ด',
          'รองประธานฝ่ายโค้ด',
          'ประธานฝ่ายเทคนิค',
          'รองประธานฝ่ายเทคนิค',
          'ประธานฝ่ายอุปกรณ์',
          'รองประธานฝ่ายอุปกรณ์',
          'ประธานฝ่ายโลจิสติกส์',
          'รองประธานฝ่ายโลจิสติกส์',
          'ประธานฝ่ายลีดเดอร์',
          'รองประธานลีดเดอร์'
        )
      )
  );
$$;


-- =========================================================
-- 3) ROLE / POSITION PROTECTION
-- Only head + teacher can change role, custom role, position.
-- =========================================================

create or replace function public.prevent_non_head_role_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if (
    old.role is distinct from new.role
    or old.custom_role_id is distinct from new.custom_role_id
    or old.department_position is distinct from new.department_position
  )
  and not public.is_head() then
    raise exception 'Only head/teacher can change roles or department positions';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;

create trigger protect_profile_role
before update on public.profiles
for each row
execute function public.prevent_non_head_role_change();


-- =========================================================
-- 4) WORK / ATTENDANCE / CHECK-IN POLICIES
-- Explicitly drop both known naming variants where applicable.
-- This makes the migration safe after a partial previous run.
-- =========================================================

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


create policy "appointments manage"
on public.appointments
for all
to authenticated
using (public.can_manage_work())
with check (public.can_manage_work());


create policy "plans manage"
on public.plans
for all
to authenticated
using (public.can_manage_work())
with check (public.can_manage_work());


create policy "plan topics manage"
on public.plan_topics
for all
to authenticated
using (public.can_manage_work())
with check (public.can_manage_work());


create policy "plan members manage"
on public.plan_members
for all
to authenticated
using (public.can_manage_work())
with check (public.can_manage_work());


create policy "plan duties manage"
on public.plan_duties
for all
to authenticated
using (public.can_manage_work())
with check (public.can_manage_work());


create policy "plan slots manage"
on public.plan_slots
for all
to authenticated
using (public.can_manage_work())
with check (public.can_manage_work());


create policy "attendance manage"
on public.attendance
for all
to authenticated
using (public.can_manage_work())
with check (public.can_manage_work());


-- Master check-in member database remains restricted to
-- head / teacher / deputy. Department presidents/vice-presidents
-- get attendance-taking permission through attendance manage above,
-- without automatically receiving master member-data editing rights.
create policy "checkin manage"
on public.checkin_members
for all
to authenticated
using (public.is_deputy_or_head())
with check (public.is_deputy_or_head());


-- =========================================================
-- 5) ANNOUNCEMENT PERMISSIONS
-- =========================================================

drop policy if exists "announcements manage deputy" on public.announcements;
drop policy if exists "announcements manage work" on public.announcements;

create policy "announcements manage work"
on public.announcements
for all
to authenticated
using (public.can_manage_work())
with check (public.can_manage_work());


-- =========================================================
-- 6) CHECK-IN AVATAR STORAGE
-- =========================================================

drop policy if exists "checkin avatar manage" on storage.objects;

create policy "checkin avatar manage"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'checkin-avatars'
  and public.is_deputy_or_head()
)
with check (
  bucket_id = 'checkin-avatars'
  and public.is_deputy_or_head()
);


-- =========================================================
-- 7) SAFE SERVER-SIDE CHECK-IN REORDERING
-- =========================================================

create or replace function public.reorder_checkin_members(member_ids uuid[])
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  i integer;
  member_id uuid;
begin
  if not public.is_deputy_or_head() then
    raise exception 'Not allowed';
  end if;

  if member_ids is null
     or array_length(member_ids, 1) is null then
    return;
  end if;

  if (
    select count(*)
    from unnest(member_ids)
  ) <> (
    select count(*)
    from public.checkin_members
    where id = any(member_ids)
  ) then
    raise exception 'Invalid member list';
  end if;

  -- Temporary negative values avoid collisions with the unique sort_no constraint.
  i := 1;

  foreach member_id in array member_ids loop
    update public.checkin_members
    set sort_no = -i
    where id = member_id;

    i := i + 1;
  end loop;

  i := 1;

  foreach member_id in array member_ids loop
    update public.checkin_members
    set sort_no = i
    where id = member_id;

    i := i + 1;
  end loop;
end;
$$;


create index if not exists checkin_members_sort_idx
on public.checkin_members(sort_no);


-- =========================================================
-- 8) ANNOUNCEMENT IMAGE STORAGE
-- =========================================================

drop policy if exists "announcement images manager write" on storage.objects;
drop policy if exists "announcement images manager delete" on storage.objects;

create policy "announcement images manager write"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'announcement-images'
  and public.can_manage_work()
);

create policy "announcement images manager delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'announcement-images'
  and public.can_manage_work()
);


-- =========================================================
-- DONE
-- =========================================================
