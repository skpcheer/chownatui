-- CHOWNATUI v2.9.2 UI/permissions fix
-- Safe to run after the previous v2.9.2 migrations.

-- 1) Make head/teacher role assignment reliable through a guarded RPC.
create or replace function public.set_member_role(
  target_user_id uuid,
  new_role text,
  new_custom_role_id uuid default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_head() then
    raise exception 'Only head/teacher can change roles';
  end if;

  if new_role not in ('member','deputy','head','teacher') then
    raise exception 'Invalid role';
  end if;

  if new_custom_role_id is not null then
    if new_role <> 'member' then
      raise exception 'Custom role must use member base role';
    end if;
    if not exists (select 1 from public.custom_roles where id=new_custom_role_id) then
      raise exception 'Custom role not found';
    end if;
  end if;

  update public.profiles
  set role=new_role,
      custom_role_id=new_custom_role_id
  where id=target_user_id;

  if not found then
    raise exception 'Member not found';
  end if;
end;
$$;

grant execute on function public.set_member_role(uuid,text,uuid) to authenticated;

-- 2) Keep direct profile management policies correct as well.
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "head manages profiles" on public.profiles;
create policy "profiles self update" on public.profiles
for update to authenticated
using (id=auth.uid())
with check (id=auth.uid());
create policy "head manages profiles" on public.profiles
for update to authenticated
using (public.is_head())
with check (public.is_head());

-- 3) Independent layout storage for the two management views.
create table if not exists public.layout_configs (
  key text primary key,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.layout_configs enable row level security;

drop policy if exists "layout configs read" on public.layout_configs;
drop policy if exists "layout configs manage" on public.layout_configs;
create policy "layout configs read" on public.layout_configs
for select to authenticated using (true);
create policy "layout configs manage" on public.layout_configs
for all to authenticated
using (public.is_head())
with check (public.is_head());

insert into public.layout_configs(key,config)
values
('members', jsonb_build_object('fields', jsonb_build_array(
  jsonb_build_object('id','identity','label','ชื่อ / ตำแหน่ง','x',1,'y',1,'w',7,'h',1,'visible',true),
  jsonb_build_object('id','avatar','label','รูปโปรไฟล์','x',9,'y',1,'w',3,'h',3,'visible',true),
  jsonb_build_object('id','bio','label','แนะนำตัว','x',1,'y',2,'w',8,'h',1,'visible',true),
  jsonb_build_object('id','basic','label','ชั้น · ชื่อเล่น · วันเกิด','x',1,'y',3,'w',11,'h',1,'visible',true),
  jsonb_build_object('id','date','label','วันที่','x',1,'y',4,'w',5,'h',1,'visible',true),
  jsonb_build_object('id','availability','label','เวลาว่าง','x',6,'y',4,'w',6,'h',1,'visible',true)
))),
('checkin', jsonb_build_object('fields', jsonb_build_array(
  jsonb_build_object('id','full_name','label','ชื่อ-สกุล','x',1,'y',1,'w',5,'h',1,'visible',true),
  jsonb_build_object('id','nickname','label','ชื่อเล่น','x',6,'y',1,'w',3,'h',1,'visible',true),
  jsonb_build_object('id','class_name','label','ชั้น','x',9,'y',1,'w',2,'h',1,'visible',true),
  jsonb_build_object('id','team','label','ฝ่าย','x',11,'y',1,'w',2,'h',1,'visible',true),
  jsonb_build_object('id','sort_no','label','ลำดับ','x',1,'y',2,'w',2,'h',1,'visible',true),
  jsonb_build_object('id','show_in_checkin','label','แสดงในเช็คชื่อ','x',3,'y',2,'w',4,'h',1,'visible',true)
)))
on conflict (key) do nothing;
