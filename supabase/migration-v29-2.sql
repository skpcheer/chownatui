-- CHOWNATUI v2.9.2
-- Run AFTER migration-v29-1-event-colors.sql and previous migrations.
-- Adds check-in master controls/order, shared avatar crop fields, and work permissions.

-- 1) Check-in master data
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

-- 2) Common permission helpers: head + teacher are full admins;
-- deputy and the listed department positions can manage work/check-in/announcements.
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

-- 3) Role assignment must work for head/teacher.
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
for each row execute procedure public.prevent_non_head_role_change();

-- 4) Work permissions for department presidents/vice-presidents.
-- Keep read policies open; only management/write policies change.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['appointments','plans','plan_topics','plan_members','plan_duties','plan_slots','attendance','checkin_members'] LOOP
    EXECUTE format('drop policy if exists %I on public.%I', t || ' manage', t);
  END LOOP;
END $$;

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

-- 5) Announcement permissions.
drop policy if exists "announcements manage deputy" on public.announcements;
create policy "announcements manage work" on public.announcements
  for all to authenticated using(public.can_manage_work()) with check(public.can_manage_work());

-- 6) Check-in avatar storage permissions.
drop policy if exists "checkin avatar manage" on storage.objects;
create policy "checkin avatar manage" on storage.objects
  for all to authenticated
  using(bucket_id='checkin-avatars' and public.is_deputy_or_head())
  with check(bucket_id='checkin-avatars' and public.is_deputy_or_head());

-- 7) Safe server-side reordering for the check-in master list.
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
  -- Temporary negative numbers avoid collisions with the unique sort_no constraint.
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

-- Keep existing rows visible in check-in unless explicitly switched off.
create index if not exists checkin_members_sort_idx on public.checkin_members(sort_no);


-- Announcement image uploads follow the same work-manager permission as announcements.
drop policy if exists "announcement images manager write" on storage.objects;
drop policy if exists "announcement images manager delete" on storage.objects;
create policy "announcement images manager write" on storage.objects
  for insert to authenticated with check(bucket_id='announcement-images' and public.can_manage_work());
create policy "announcement images manager delete" on storage.objects
  for delete to authenticated using(bucket_id='announcement-images' and public.can_manage_work());
