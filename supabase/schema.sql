-- =========================================================
-- CHOWNATUI DATABASE SETUP
-- Safe to run again
-- =========================================================

create extension if not exists pgcrypto;


-- =========================================================
-- 1) USER ROLE TYPE
-- =========================================================

do $$
begin
  create type public.user_role as enum ('member', 'admin');
exception
  when duplicate_object then null;
end
$$;


-- =========================================================
-- 2) PROFILES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'สมาชิก',
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);


-- =========================================================
-- 3) AVAILABILITY
-- =========================================================

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null check (
    date between '2026-09-27' and '2026-10-31'
  ),
  start_time time not null,
  end_time time not null,
  notes text,
  check (start_time < end_time)
);


-- =========================================================
-- 4) JOBS
-- =========================================================

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null check (
    date between '2026-09-27' and '2026-10-31'
  ),
  start_time time not null,
  end_time time not null,
  location text,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (start_time < end_time)
);


-- =========================================================
-- 5) JOB MEMBERS
-- =========================================================

create table if not exists public.job_members (
  job_id uuid references public.jobs(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (job_id, user_id)
);


-- =========================================================
-- 6) DAY STATUS
-- =========================================================

create table if not exists public.day_status (
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  status text not null check (
    status in ('available', 'unavailable')
  ),
  primary key (user_id, date)
);


-- =========================================================
-- 7) ADMIN CHECK FUNCTION
-- =========================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;


-- =========================================================
-- 8) AUTO CREATE PROFILE AFTER SIGN UP
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      'สมาชิก'
    )
  );

  return new;
end;
$$;


-- =========================================================
-- 9) AUTH TRIGGER
-- =========================================================

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();


-- =========================================================
-- 10) ENABLE RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.availability enable row level security;
alter table public.jobs enable row level security;
alter table public.job_members enable row level security;
alter table public.day_status enable row level security;


-- =========================================================
-- 11) PROFILES POLICIES
-- =========================================================

drop policy if exists "profiles read authenticated"
on public.profiles;

create policy "profiles read authenticated"
on public.profiles
for select
to authenticated
using (true);


drop policy if exists "profiles self update"
on public.profiles;

create policy "profiles self update"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
)
with check (
  id = auth.uid()
  or public.is_admin()
);


drop policy if exists "admin manage profiles"
on public.profiles;

create policy "admin manage profiles"
on public.profiles
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


-- =========================================================
-- 12) AVAILABILITY POLICIES
-- =========================================================

drop policy if exists "availability read authenticated"
on public.availability;

create policy "availability read authenticated"
on public.availability
for select
to authenticated
using (true);


drop policy if exists "availability self insert"
on public.availability;

create policy "availability self insert"
on public.availability
for insert
to authenticated
with check (
  user_id = auth.uid()
);


drop policy if exists "availability self update"
on public.availability;

create policy "availability self update"
on public.availability
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or public.is_admin()
);


drop policy if exists "availability self delete"
on public.availability;

create policy "availability self delete"
on public.availability
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);


-- =========================================================
-- 13) JOB POLICIES
-- =========================================================

drop policy if exists "jobs read authenticated"
on public.jobs;

create policy "jobs read authenticated"
on public.jobs
for select
to authenticated
using (true);


drop policy if exists "admin jobs insert"
on public.jobs;

create policy "admin jobs insert"
on public.jobs
for insert
to authenticated
with check (
  public.is_admin()
);


drop policy if exists "admin jobs update"
on public.jobs;

create policy "admin jobs update"
on public.jobs
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


drop policy if exists "admin jobs delete"
on public.jobs;

create policy "admin jobs delete"
on public.jobs
for delete
to authenticated
using (
  public.is_admin()
);


-- =========================================================
-- 14) JOB MEMBERS POLICIES
-- =========================================================

drop policy if exists "job members read authenticated"
on public.job_members;

create policy "job members read authenticated"
on public.job_members
for select
to authenticated
using (true);


drop policy if exists "admin job members write"
on public.job_members;

create policy "admin job members write"
on public.job_members
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


-- =========================================================
-- 15) DAY STATUS POLICIES
-- =========================================================

drop policy if exists "day status readable by authenticated"
on public.day_status;

create policy "day status readable by authenticated"
on public.day_status
for select
to authenticated
using (true);


drop policy if exists "users manage own day status"
on public.day_status;

create policy "users manage own day status"
on public.day_status
for all
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


-- =========================================================
-- 16) OPTIONAL AVAILABILITY NOTE
-- =========================================================

alter table public.availability
add column if not exists notes text;


-- =========================================================
-- FINISHED
-- =========================================================