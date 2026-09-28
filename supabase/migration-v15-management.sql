-- chownatui V15: dynamic teams, teacher role, custom rank management, and safe admin checks

-- 1) Dynamic team list. Existing default teams are seeded so the UI can edit them too.
create table if not exists public.team_options(
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.team_options(name,sort_order) values
('โค้ด',1),('เทคนิค',2),('อุปกรณ์',3),('โลจิสติกส์',4),('ลีดเดอร์',5)
on conflict(name) do nothing;

alter table public.team_options enable row level security;
drop policy if exists "team options read" on public.team_options;
drop policy if exists "team options manage" on public.team_options;
create policy "team options read" on public.team_options for select to authenticated using(true);
create policy "team options manage" on public.team_options for all to authenticated using(public.is_head()) with check(public.is_head());

-- 2) Teacher is a full-access system rank, equivalent to head.
-- The role column is already text after migration-v4.
alter table public.profiles alter column role set default 'member';

create or replace function public.is_head() returns boolean
language sql stable security definer set search_path=public as $$
  select public.current_role() in ('head','teacher');
$$;

create or replace function public.is_deputy_or_head() returns boolean
language sql stable security definer set search_path=public as $$
  select public.current_role() in ('head','teacher','deputy');
$$;

-- 3) Make sure the role-protection trigger uses the current head/teacher rule.
create or replace function public.prevent_non_head_role_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.role is distinct from new.role and not public.is_head() then
    raise exception 'Only head or teacher can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute procedure public.prevent_non_head_role_change();

-- Keep the intended profile policies after any older migration has been run.
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "head manages profiles" on public.profiles;
drop policy if exists "profiles admin" on public.profiles;
drop policy if exists "admin manage profiles" on public.profiles;
create policy "profiles self update" on public.profiles
for update to authenticated
using(id=auth.uid()) with check(id=auth.uid());
create policy "head manages profiles" on public.profiles
for update to authenticated
using(public.is_head()) with check(public.is_head());

-- custom_roles already exists from migration-v4. Make sure heads can manage it.
drop policy if exists "custom roles read" on public.custom_roles;
drop policy if exists "head custom roles write" on public.custom_roles;
create policy "custom roles read" on public.custom_roles for select to authenticated using(true);
create policy "head custom roles write" on public.custom_roles for all to authenticated using(public.is_head()) with check(public.is_head());

-- 4) Helpful indexes for long-term attendance/history performance.
create index if not exists attendance_date_type_idx on public.attendance(date,type);
create index if not exists attendance_member_date_idx on public.attendance(member_id,date);
create index if not exists plans_date_idx on public.plans(date);
create index if not exists appointments_date_idx on public.appointments(date);
create index if not exists availability_user_date_idx on public.availability(user_id,date);
