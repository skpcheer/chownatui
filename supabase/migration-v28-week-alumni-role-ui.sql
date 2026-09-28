-- chownatui V2.8
-- เพิ่มรุ่นสำหรับตำแหน่งศิษย์เก่า โดยไม่เปลี่ยนข้อมูล/สิทธิ์ส่วนอื่น

alter table public.profiles
  add column if not exists alumni_generation integer;

alter table public.profiles
  drop constraint if exists profiles_alumni_generation_check;

alter table public.profiles
  add constraint profiles_alumni_generation_check
  check (alumni_generation is null or alumni_generation >= 0);

create index if not exists profiles_alumni_generation_idx on public.profiles(alumni_generation);
