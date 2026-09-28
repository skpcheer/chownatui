-- chownatui v2.4: deputy/head team assignment
-- รองใหญ่ตุ้ย (ระบบ role=deputy), หัวหน้าตุ้ย และอาจารย์ตุ้ย
-- สามารถกำหนด/เปลี่ยน "ฝ่าย" ให้สมาชิกได้

create or replace function public.prevent_non_head_role_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if (old.role is distinct from new.role or old.custom_role_id is distinct from new.custom_role_id)
     and not public.is_head() then
    raise exception 'Only head/teacher can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute procedure public.prevent_non_head_role_change();

-- A normal member cannot assign a team to themselves. Deputy/head/teacher can.
create or replace function public.prevent_non_manager_team_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.team is distinct from new.team and not public.is_deputy_or_head() then
    raise exception 'Only deputy/head/teacher can assign teams';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_team on public.profiles;
create trigger protect_profile_team
before update on public.profiles
for each row execute procedure public.prevent_non_manager_team_change();

-- Keep the existing self-update behavior and add deputy/head team assignment.
drop policy if exists "profiles team managers" on public.profiles;
create policy "profiles team managers" on public.profiles
for update to authenticated
using(public.is_deputy_or_head())
with check(public.is_deputy_or_head());
