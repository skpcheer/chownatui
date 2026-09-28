-- chownatui v20 (safe planning/date-range migration)
-- This version is intentionally idempotent and can be re-run safely.
-- Run after migration-v4 (or after the existing production migrations).

create extension if not exists pgcrypto;

-- Make the base tables available even if an earlier planning migration was skipped.
create table if not exists public.appointments(
  id uuid primary key default gen_random_uuid(),
  type text not null check(type in ('ซ้อมน้อง','อยู่เย็น','นอนโรงเรียน','ถ่ายคลิป','อื่นๆ')),
  title text not null,
  date date not null,
  start_time time,
  end_time time,
  location text,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check(start_time is null or end_time is null or start_time < end_time)
);

create table if not exists public.plans(
  id uuid primary key default gen_random_uuid(),
  type text not null check(type in ('งานฝ่าย','งานหลัก','ซ้อมเชียร์')),
  title text not null,
  team text,
  date date not null,
  start_time time,
  end_time time,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check(start_time is null or end_time is null or start_time < end_time)
);

-- Existing installations may have required times from migration-v4.
alter table public.appointments alter column start_time drop not null;
alter table public.appointments alter column end_time drop not null;
alter table public.plans alter column start_time drop not null;
alter table public.plans alter column end_time drop not null;

-- Date-range fields.
alter table public.plans add column if not exists end_date date;
update public.plans set end_date=date where end_date is null;
alter table public.plans alter column end_date set not null;
alter table public.plans drop constraint if exists plans_end_date_check;
alter table public.plans add constraint plans_end_date_check check(end_date>=date);

alter table public.appointments add column if not exists end_date date;
update public.appointments set end_date=date where end_date is null;
alter table public.appointments alter column end_date set not null;
alter table public.appointments drop constraint if exists appointments_end_date_check;
alter table public.appointments add constraint appointments_end_date_check check(end_date>=date);

create index if not exists plans_date_range_idx on public.plans(date,end_date);
create index if not exists appointments_date_range_idx on public.appointments(date,end_date);

-- Supporting tables used by the planning UI. Safe if they already exist.
create table if not exists public.plan_topics(
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0
);
create table if not exists public.plan_members(
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key(plan_id,user_id)
);
create table if not exists public.plan_duties(
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  duty_name text not null,
  user_ids uuid[] not null default '{}'
);
create table if not exists public.plan_slots(
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  title text not null,
  start_time time not null,
  end_time time not null,
  notes text,
  check(start_time < end_time)
);

-- Requested team-position titles. Create the role table only when a legacy install
-- does not already have it; existing permissions/data are preserved.
create table if not exists public.custom_roles(
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  can_manage_roles boolean not null default false,
  can_manage_work boolean not null default false,
  can_manage_checkin boolean not null default false,
  can_manage_cleaning boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists custom_role_id uuid references public.custom_roles(id) on delete set null;

-- Ensure the permission helpers exist even when an older optional migration was skipped.
create or replace function public.current_role() returns text
language sql stable security definer set search_path=public as $$
  select coalesce((select role from public.profiles where id=auth.uid()),'member');
$$;
create or replace function public.is_head() returns boolean
language sql stable security definer set search_path=public as $$
  select public.current_role() in ('head','teacher');
$$;
create or replace function public.is_deputy_or_head() returns boolean
language sql stable security definer set search_path=public as $$
  select public.current_role() in ('head','teacher','deputy');
$$;

insert into public.custom_roles(name)
select x.name
from (values
 ('ประธานเชียร์'),
 ('รองประธานเชียร์'),
 ('ประธานฝ่ายโค้ด'),
 ('รองประธานฝ่ายโค้ด'),
 ('ประธานฝ่ายเทคนิค'),
 ('รองประธานฝ่ายเทคนิค'),
 ('ประธานฝ่ายอุปกรณ์'),
 ('รองประธานฝ่ายอุปกรณ์'),
 ('ประธานฝ่ายโลจิสติกส์'),
 ('รองประธานฝ่ายโลจิสติกส์'),
 ('ประธานฝ่ายลีดเดอร์'),
 ('รองประธานลีดเดอร์'),
 ('ศิษย์เก่า')
) as x(name)
where not exists (select 1 from public.custom_roles r where r.name=x.name);

-- RLS only adds missing policies; it does not replace existing policies.
alter table public.appointments enable row level security;
alter table public.plans enable row level security;
alter table public.plan_topics enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_duties enable row level security;
alter table public.plan_slots enable row level security;

drop policy if exists "appointments read" on public.appointments;
drop policy if exists "appointments manage" on public.appointments;
create policy "appointments read" on public.appointments for select to authenticated using(true);
create policy "appointments manage" on public.appointments for all to authenticated using(public.is_deputy_or_head()) with check(public.is_deputy_or_head());

drop policy if exists "plans read" on public.plans;
drop policy if exists "plans manage" on public.plans;
create policy "plans read" on public.plans for select to authenticated using(true);
create policy "plans manage" on public.plans for all to authenticated using(public.is_deputy_or_head()) with check(public.is_deputy_or_head());

drop policy if exists "plan topics read" on public.plan_topics;
drop policy if exists "plan topics manage" on public.plan_topics;
create policy "plan topics read" on public.plan_topics for select to authenticated using(true);
create policy "plan topics manage" on public.plan_topics for all to authenticated using(public.is_deputy_or_head()) with check(public.is_deputy_or_head());

drop policy if exists "plan members read" on public.plan_members;
drop policy if exists "plan members manage" on public.plan_members;
create policy "plan members read" on public.plan_members for select to authenticated using(true);
create policy "plan members manage" on public.plan_members for all to authenticated using(public.is_deputy_or_head()) with check(public.is_deputy_or_head());

drop policy if exists "plan duties read" on public.plan_duties;
drop policy if exists "plan duties manage" on public.plan_duties;
create policy "plan duties read" on public.plan_duties for select to authenticated using(true);
create policy "plan duties manage" on public.plan_duties for all to authenticated using(public.is_deputy_or_head()) with check(public.is_deputy_or_head());

drop policy if exists "plan slots read" on public.plan_slots;
drop policy if exists "plan slots manage" on public.plan_slots;
create policy "plan slots read" on public.plan_slots for select to authenticated using(true);
create policy "plan slots manage" on public.plan_slots for all to authenticated using(public.is_deputy_or_head()) with check(public.is_deputy_or_head());
