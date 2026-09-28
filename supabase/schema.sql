-- chownatui production schema for Supabase
create extension if not exists pgcrypto;

create type public.user_role as enum ('member','admin');
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'สมาชิก',
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null check(date between '2026-09-27' and '2026-10-31'),
  start_time time not null,
  end_time time not null,
  check(start_time < end_time)
);
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null check(date between '2026-09-27' and '2026-10-31'),
  start_time time not null,
  end_time time not null,
  location text,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check(start_time < end_time)
);
create table if not exists public.job_members (
  job_id uuid references public.jobs(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key(job_id,user_id)
);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin'); $$;
alter table public.profiles enable row level security;
alter table public.availability enable row level security;
alter table public.jobs enable row level security;
alter table public.job_members enable row level security;
create policy "profiles read authenticated" on public.profiles for select to authenticated using (true);
create policy "profiles self update" on public.profiles for update to authenticated using(id=auth.uid() or public.is_admin()) with check(id=auth.uid() or public.is_admin());
create policy "admin manage profiles" on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "availability read authenticated" on public.availability for select to authenticated using(true);
create policy "availability self insert" on public.availability for insert to authenticated with check(user_id=auth.uid());
create policy "availability self update" on public.availability for update to authenticated using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
create policy "availability self delete" on public.availability for delete to authenticated using(user_id=auth.uid() or public.is_admin());
create policy "jobs read authenticated" on public.jobs for select to authenticated using(true);
create policy "admin jobs insert" on public.jobs for insert to authenticated with check(public.is_admin());
create policy "admin jobs update" on public.jobs for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "admin jobs delete" on public.jobs for delete to authenticated using(public.is_admin());
create policy "job members read authenticated" on public.job_members for select to authenticated using(true);
create policy "admin job members write" on public.job_members for all to authenticated using(public.is_admin()) with check(public.is_admin());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,email,display_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name','สมาชิก')); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- หลังสร้างบัญชี Admin คนแรก ให้รันคำสั่งนี้ใน SQL Editor โดยแทน EMAIL ให้เป็นอีเมลของคุณ:
-- update public.profiles set role='admin' where email='EMAIL';

-- Daily self-declared status: available / unavailable.
create table if not exists public.day_status (
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  status text not null check (status in ('available','unavailable')),
  primary key (user_id,date)
);
alter table public.day_status enable row level security;
create policy if not exists "day status readable by authenticated" on public.day_status for select to authenticated using (true);
create policy if not exists "users manage own day status" on public.day_status for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);


-- Optional note attached to an availability interval
alter table public.availability add column if not exists notes text;
