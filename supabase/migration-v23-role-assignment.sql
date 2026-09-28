-- chownatui v23: protect all custom/position role assignments
-- Only หัวหน้าตุ้ย and อาจารย์ตุ้ย may assign or change custom positions,
-- including ประธาน/รองประธาน roles.

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
