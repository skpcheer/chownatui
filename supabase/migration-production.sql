-- chownatui production hardening migration
-- Run this ONCE in Supabase SQL Editor after the original schema.sql.

-- 1) Protect profile roles from being changed by a normal member.
create or replace function public.prevent_non_admin_role_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only an admin can change user roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute procedure public.prevent_non_admin_role_change();

-- Remove the earlier broad self-update policy and replace it with a safe self profile policy.
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "admin manage profiles" on public.profiles;
drop policy if exists "profiles admin" on public.profiles;
create policy "profiles self update" on public.profiles
for update to authenticated
using (id=auth.uid())
with check (id=auth.uid());
create policy "admin manage profiles" on public.profiles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 2) Prevent availability from overlapping an assigned job at DB level.
create or replace function public.prevent_availability_job_overlap()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if exists (
    select 1
    from public.job_members jm
    join public.jobs j on j.id=jm.job_id
    where jm.user_id=new.user_id
      and j.date=new.date
      and new.start_time < j.end_time
      and j.start_time < new.end_time
  ) then
    raise exception 'Availability overlaps an assigned job';
  end if;
  return new;
end;
$$;

drop trigger if exists availability_no_job_overlap on public.availability;
create trigger availability_no_job_overlap
before insert or update on public.availability
for each row execute procedure public.prevent_availability_job_overlap();

-- 3) Prevent assigning/editing a job that overlaps a member's availability.
create or replace function public.prevent_job_availability_overlap()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if exists (
    select 1
    from public.job_members jm
    join public.availability a on a.user_id=jm.user_id
    where jm.job_id=new.id
      and a.date=new.date
      and new.start_time < a.end_time
      and a.start_time < new.end_time
  ) then
    raise exception 'Job overlaps a member availability';
  end if;
  return new;
end;
$$;

drop trigger if exists job_no_availability_overlap on public.jobs;
create trigger job_no_availability_overlap
before insert or update on public.jobs
for each row execute procedure public.prevent_job_availability_overlap();

create or replace function public.prevent_job_member_availability_overlap()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if exists (
    select 1
    from public.jobs j
    join public.availability a on a.user_id=new.user_id
    where j.id=new.job_id
      and a.date=j.date
      and j.start_time < a.end_time
      and a.start_time < j.end_time
  ) then
    raise exception 'Job overlaps a member availability';
  end if;
  return new;
end;
$$;

drop trigger if exists job_member_no_availability_overlap on public.job_members;
create trigger job_member_no_availability_overlap
before insert or update on public.job_members
for each row execute procedure public.prevent_job_member_availability_overlap();
