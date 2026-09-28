-- chownatui v4 migration
-- Run after the existing schema/migrations. This migration expands the app without using a service-role key.

create extension if not exists pgcrypto;

-- 1) Roles, teams and profile fields
alter table public.profiles alter column role drop default;
alter table public.profiles alter column role type text using case when role::text='admin' then 'head' else 'member' end;
alter table public.profiles alter column role set default 'member';
alter table public.profiles add column if not exists team text;
update public.profiles set role='head' where role='admin';
update public.profiles set role='member' where role is null;

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

create or replace function public.current_role() returns text
language sql stable security definer set search_path=public as $$
  select coalesce((select role from public.profiles where id=auth.uid()),'member');
$$;
create or replace function public.is_head() returns boolean
language sql stable security definer set search_path=public as $$ select public.current_role()='head'; $$;
create or replace function public.is_deputy_or_head() returns boolean
language sql stable security definer set search_path=public as $$ select public.current_role() in ('head','deputy'); $$;

-- 2) Remove the old date restriction so the app works beyond Oct 2026.
alter table public.availability drop constraint if exists availability_date_check;
alter table public.jobs drop constraint if exists jobs_date_check;

-- 3) Appointments
create table if not exists public.appointments(
  id uuid primary key default gen_random_uuid(),
  type text not null check(type in ('ซ้อมน้อง','อยู่เย็น','นอนโรงเรียน','ถ่ายคลิป','อื่นๆ')),
  title text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  location text,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check(start_time < end_time)
);

-- 4) Long-term plans, topics, assigned members, rehearsal duties and time blocks
create table if not exists public.plans(
  id uuid primary key default gen_random_uuid(),
  type text not null check(type in ('งานฝ่าย','งานหลัก','ซ้อมเชียร์')),
  title text not null,
  team text,
  date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check(start_time < end_time)
);
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

-- 5) Check-in master list
create table if not exists public.checkin_members(
  id uuid primary key default gen_random_uuid(),
  sort_no integer not null unique,
  full_name text not null,
  class_name text not null,
  nickname text not null,
  team text not null,
  avatar_url text,
  linked_user_id uuid references public.profiles(id) on delete set null
);

create table if not exists public.attendance(
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.checkin_members(id) on delete cascade,
  date date not null,
  type text not null check(type in ('rehearsal','evening','sleep')),
  status text not null,
  note text,
  checked_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(member_id,date,type)
);

-- 6) Cleaning duty. One row per day, maximum 8 user IDs.
create table if not exists public.cleaning_duties(
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  user_ids uuid[] not null default '{}',
  rooms text[] not null default '{}',
  created_by uuid references public.profiles(id),
  check(cardinality(user_ids)<=8)
);

-- 7) Settings table for future global settings.
create table if not exists public.settings(
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 8) RLS
alter table public.custom_roles enable row level security;
alter table public.appointments enable row level security;
alter table public.plans enable row level security;
alter table public.plan_topics enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_duties enable row level security;
alter table public.plan_slots enable row level security;
alter table public.checkin_members enable row level security;
alter table public.attendance enable row level security;
alter table public.cleaning_duties enable row level security;
alter table public.settings enable row level security;

-- Replace old profile policies safely.
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "admin manage profiles" on public.profiles;
drop policy if exists "profiles read authenticated" on public.profiles;
create policy "profiles read authenticated" on public.profiles for select to authenticated using(true);
create policy "profiles self update" on public.profiles for update to authenticated
using(id=auth.uid()) with check(id=auth.uid());
create policy "head manages profiles" on public.profiles for update to authenticated
using(public.is_head()) with check(public.is_head());

create or replace function public.prevent_non_head_role_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.role is distinct from new.role and not public.is_head() then raise exception 'Only head can change roles'; end if;
 return new;
end $$;
drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update on public.profiles for each row execute procedure public.prevent_non_head_role_change();

-- helper for repeatable policies
drop policy if exists "custom roles read" on public.custom_roles;
drop policy if exists "head custom roles write" on public.custom_roles;
create policy "custom roles read" on public.custom_roles for select to authenticated using(true);
create policy "head custom roles write" on public.custom_roles for all to authenticated using(public.is_head()) with check(public.is_head());

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

drop policy if exists "checkin read" on public.checkin_members;
drop policy if exists "checkin manage" on public.checkin_members;
create policy "checkin read" on public.checkin_members for select to authenticated using(true);
create policy "checkin manage" on public.checkin_members for all to authenticated using(public.is_deputy_or_head()) with check(public.is_deputy_or_head());

drop policy if exists "attendance read" on public.attendance;
drop policy if exists "attendance manage" on public.attendance;
create policy "attendance read" on public.attendance for select to authenticated using(true);
create policy "attendance manage" on public.attendance for all to authenticated using(public.is_deputy_or_head()) with check(public.is_deputy_or_head());

drop policy if exists "cleaning read" on public.cleaning_duties;
drop policy if exists "cleaning manage" on public.cleaning_duties;
create policy "cleaning read" on public.cleaning_duties for select to authenticated using(true);
create policy "cleaning manage" on public.cleaning_duties for all to authenticated using(public.is_deputy_or_head()) with check(public.is_deputy_or_head());

drop policy if exists "settings read" on public.settings;
drop policy if exists "settings manage" on public.settings;
create policy "settings read" on public.settings for select to authenticated using(true);
create policy "settings manage" on public.settings for all to authenticated using(public.is_head()) with check(public.is_head());

-- 9) Availability can be edited by self or deputy/head, and assigned plan time cannot overlap.
drop policy if exists "availability self insert" on public.availability;
drop policy if exists "availability self update" on public.availability;
drop policy if exists "availability self delete" on public.availability;
create policy "availability self insert" on public.availability for insert to authenticated with check(user_id=auth.uid() or public.is_deputy_or_head());
create policy "availability self update" on public.availability for update to authenticated using(user_id=auth.uid() or public.is_deputy_or_head()) with check(user_id=auth.uid() or public.is_deputy_or_head());
create policy "availability self delete" on public.availability for delete to authenticated using(user_id=auth.uid() or public.is_deputy_or_head());

create or replace function public.prevent_plan_availability_overlap()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(
  select 1 from public.plan_members pm join public.plans p on p.id=pm.plan_id
  join public.availability a on a.user_id=pm.user_id and a.date=p.date
  where p.id=new.plan_id and p.start_time<a.end_time and a.start_time<p.end_time
 ) then raise exception 'แผนงานชนกับช่วงเวลาว่างของสมาชิกที่รับผิดชอบ'; end if;
 return new;
end $$;
drop trigger if exists plan_member_availability_overlap on public.plan_members;
create trigger plan_member_availability_overlap after insert or update on public.plan_members
for each row execute procedure public.prevent_plan_availability_overlap();


create or replace function public.prevent_availability_plan_overlap_v4()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(
  select 1 from public.plan_members pm join public.plans p on p.id=pm.plan_id
  where pm.user_id=new.user_id and p.date=new.date
    and p.start_time<new.end_time and new.start_time<p.end_time
 ) then raise exception 'ช่วงเวลาว่างชนกับแผนงานที่ได้รับมอบหมาย'; end if;
 return new;
end $$;
drop trigger if exists availability_plan_overlap_v4 on public.availability;
create trigger availability_plan_overlap_v4 before insert or update on public.availability
for each row execute procedure public.prevent_availability_plan_overlap_v4();

-- 10) Avatar storage already exists from profile-settings.sql; keep its policies. Add check-in image bucket.
insert into storage.buckets(id,name,public) values('checkin-avatars','checkin-avatars',true)
on conflict(id) do update set public=true;
drop policy if exists "checkin avatars public read" on storage.objects;
drop policy if exists "checkin avatars manager write" on storage.objects;
create policy "checkin avatars public read" on storage.objects for select to public using(bucket_id='checkin-avatars');
create policy "checkin avatars manager write" on storage.objects for all to authenticated
using(bucket_id='checkin-avatars' and public.is_deputy_or_head())
with check(bucket_id='checkin-avatars' and public.is_deputy_or_head());

-- 11) Seed the supplied check-in roster. Re-runnable by sort number.
insert into public.checkin_members(sort_no,full_name,class_name,nickname,team) values
(1,'เด็กหญิงปพิชญา ทองก้าย','ม.2/1','ปาล์ม','โลจิสติกส์'),
(2,'เด็กหญิงรัตนาพร ลาภทวี','ม.2/1','เบลล์','โลจิสติกส์'),
(3,'เด็กชายพชร บุญราชแขวง','ม.2/4','องศา','อุปกรณ์'),
(4,'เด็กชายรชต กลิ่นกระโทก','ม.2/4','ม่อน','ลีดเดอร์'),
(5,'เด็กหญิงนภัสวรรณ ประสาทเวช','ม.2/4','บัว','โค้ด'),
(6,'เด็กหญิงบุญญาพร ถิระศิลป์','ม.2/4','นํ้าอุ่น','โค้ด'),
(7,'เด็กชายนเรศ ไชยกัณ','ม.2/6','บาส','ลีดเดอร์'),
(8,'เด็กชายปิติภัทร ขาวปลื้ม','ม.2/6','มิวสิค','ลีดเดอร์'),
(9,'เด็กหญิงอินทิรา บัวอ่ำ','ม.2/6','ใบตอง','เทคนิค'),
(10,'เด็กหญิงปวริษา แช่ด้าน','ม.2/8','สา','อุปกรณ์'),
(11,'เด็กหญิงพิชญธิดา จันทร์แดง','ม.2/8','แตงกวา','อุปกรณ์'),
(12,'เด็กหญิงพิมพ์ลดา หว่างรักวงค์','ม.2/8','ข้าวหอม','อุปกรณ์'),
(13,'เด็กหญิงกิรณา เนตรประจักษ์','ม.2/9','ป๊อกกี้','อุปกรณ์'),
(14,'เด็กหญิงฐิติวัลย์ อุ้มชู','ม.2/9','แตงโม','โลจิสติกส์'),
(15,'เด็กหญิงสุชัญญา จันทร์ฉนวน','ม.2/9','พลอยใส','อุปกรณ์'),
(16,'เด็กชายวีรภาพ บินยีอาวัง','ม.2/10','ไข่เจียว','ลีดเดอร์'),
(17,'เด็กหญิงชลนิภา สุขตระกูล','ม.2/10','แพรว','โค้ด'),
(18,'เด็กหญิงโชติกา เอี่ยมเลิศ','ม.2/10','อันดา','โค้ด'),
(19,'เด็กหญิงณัฐธิตา เล็กกฤษดี','ม.2/10','ต้นนํ้า','โลจิสติกส์'),
(20,'เด็กหญิงวรัญญา กลิ่นจันทร์','ม.2/10','ชมพู่','โลจิสติกส์'),
(21,'เด็กหญิงอรวินท์ บุญญะสุวรรณ','ม.2/10','จูน','โลจิสติกส์'),
(22,'เด็กหญิงนุจิกาญจน์ ศักดิ์ดำรงสิทธิ์','ม.2/11','กาน','โลจิสติกส์'),
(23,'เด็กหญิงสุทธิดา แตงอ่อน','ม.2/11','เบล','โลจิสติกส์'),
(24,'เด็กหญิงฐิตาภา ไชยโม','ม.3/2','แก้มบุ๋ม','เทคนิค'),
(25,'เด็กหญิงวีรดา เจ๊ะมะ','ม.3/3','อัยด้า','เทคนิค'),
(26,'เด็กหญิงสทิตา ขาวผ่อง','ม.3/3','ข้าวหอม','เทคนิค'),
(27,'เด็กชายกฤติธี นุชเทียน','ม.3/4','เซน่อล','ลีดเดอร์'),
(28,'เด็กชายณัชสิทธิ์ กลิ่นมาลัย','ม.3/4','เจมส์','โลจิสติกส์'),
(29,'เด็กชายจารุพัฒน์ แก้วเทพ','ม.3/5','นาย','ลีดเดอร์'),
(30,'เด็กชายภาตะวัน ยาณะปลูก','ม.3/6','ต้องสู้','ลีดเดอร์'),
(31,'นางสาวตรีณปรางค์ สายด้วง','ม.4/1','มะปราง','อุปกรณ์'),
(32,'นางสาวพัชรวลัย บัวเลี้ยง','ม.4/7','จั๊กจั่น','อุปกรณ์'),
(33,'นางสาวภาวิยา ศิริภาพ','ม.4/11','กี้','อุปกรณ์'),
(34,'นายนัฐวัชน์ ไทยประคอง','ม.5/3','ฟลุ๊ค','ลีดเดอร์'),
(35,'นางสาวนํ้าผึ้ง ปัญญาไว','ม.5/11','นํ้า','โลจิสติกส์'),
(36,'นางสาวนัชชา อิ่มยิ้ม','ม.6/3','ป่าน','โค้ด'),
(37,'นางสาวณัฐธิดา นันทิยาพร','ม.6/4','เนย','โค้ด'),
(38,'นางสาวธมวรรณ น้อยสถิตย์','ม.6/5','เกรซ','อุปกรณ์'),
(39,'นายจิตติพัฒน์ แก้วเทพ','ม.6/7','เนม','เทคนิค'),
(40,'นางสาวกันยากรณ์ จันทร์ใส','ม.6/7','นัส','โค้ด'),
(41,'นางสาวทิพย์สุดา สิริพงษ์','ม.6/7','ตัง','โลจิสติกส์'),
(42,'นายปุญชรัศมิ์ ผลทรัพย์เจริญ','ม.6/9','เกรท','ลีดเดอร์')
on conflict(sort_no) do update set full_name=excluded.full_name,class_name=excluded.class_name,nickname=excluded.nickname,team=excluded.team;

-- After running this migration, make your own first account head:
-- update public.profiles set role='head' where email='YOUR_EMAIL';
