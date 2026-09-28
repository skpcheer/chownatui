-- chownatui V2.7
-- แยก "ตำแหน่งฝ่าย" ออกจาก "ยศ" เพื่อไม่ให้ประธาน/รองประธานถูกนับเป็นยศ

alter table public.profiles
  add column if not exists department_position text;

-- ย้ายข้อมูลตำแหน่งฝ่ายจาก custom_roles รุ่นเก่า ก่อนลบตัวเลือกเก่าออก
update public.profiles p
set department_position = r.name
from public.custom_roles r
where p.custom_role_id = r.id
  and r.name in (
    'ประธานเชียร์','รองประธานเชียร์',
    'ประธานฝ่ายโค้ด','รองประธานฝ่ายโค้ด',
    'ประธานฝ่ายเทคนิค','รองประธานฝ่ายเทคนิค',
    'ประธานฝ่ายอุปกรณ์','รองประธานฝ่ายอุปกรณ์',
    'ประธานฝ่ายโลจิสติกส์','รองประธานฝ่ายโลจิสติกส์',
    'ประธานฝ่ายลีดเดอร์','รองประธานลีดเดอร์','ศิษย์เก่า'
  );

-- ตำแหน่งประธาน/รองประธานของฝ่ายปกติต้องอยู่ในฝ่ายนั้นเสมอ
update public.profiles
set team = case department_position
  when 'ประธานฝ่ายโค้ด' then 'โค้ด'
  when 'รองประธานฝ่ายโค้ด' then 'โค้ด'
  when 'ประธานฝ่ายเทคนิค' then 'เทคนิค'
  when 'รองประธานฝ่ายเทคนิค' then 'เทคนิค'
  when 'ประธานฝ่ายอุปกรณ์' then 'อุปกรณ์'
  when 'รองประธานฝ่ายอุปกรณ์' then 'อุปกรณ์'
  when 'ประธานฝ่ายโลจิสติกส์' then 'โลจิสติกส์'
  when 'รองประธานฝ่ายโลจิสติกส์' then 'โลจิสติกส์'
  when 'ประธานฝ่ายลีดเดอร์' then 'ลีดเดอร์'
  when 'รองประธานลีดเดอร์' then 'ลีดเดอร์'
  else team
end
where department_position is not null;

-- ตำแหน่งฝ่ายไม่ควรค้างอยู่ใน custom_role_id
update public.profiles p
set custom_role_id = null
where p.custom_role_id in (
  select r.id from public.custom_roles r where r.name in (
    'ประธานเชียร์','รองประธานเชียร์',
    'ประธานฝ่ายโค้ด','รองประธานฝ่ายโค้ด',
    'ประธานฝ่ายเทคนิค','รองประธานฝ่ายเทคนิค',
    'ประธานฝ่ายอุปกรณ์','รองประธานฝ่ายอุปกรณ์',
    'ประธานฝ่ายโลจิสติกส์','รองประธานฝ่ายโลจิสติกส์',
    'ประธานฝ่ายลีดเดอร์','รองประธานลีดเดอร์','ศิษย์เก่า'
  )
);

delete from public.custom_roles
where name in (
  'ประธานเชียร์','รองประธานเชียร์',
  'ประธานฝ่ายโค้ด','รองประธานฝ่ายโค้ด',
  'ประธานฝ่ายเทคนิค','รองประธานฝ่ายเทคนิค',
  'ประธานฝ่ายอุปกรณ์','รองประธานฝ่ายอุปกรณ์',
  'ประธานฝ่ายโลจิสติกส์','รองประธานฝ่ายโลจิสติกส์',
  'ประธานฝ่ายลีดเดอร์','รองประธานลีดเดอร์','ศิษย์เก่า'
);

-- เฉพาะหัวหน้าตุ้ย/อาจารย์ตุ้ยกำหนดตำแหน่งฝ่ายได้
create or replace function public.prevent_non_head_role_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
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

create index if not exists profiles_department_position_idx on public.profiles(department_position);
create index if not exists profiles_team_idx on public.profiles(team);
