-- chownatui v20: date ranges, optional plan members, and team position roles
-- Run this migration in Supabase SQL Editor after the previous migrations.

alter table public.plans
  add column if not exists end_date date;
update public.plans set end_date=date where end_date is null;
alter table public.plans alter column end_date set not null;
drop constraint if exists plans_end_date_check;
alter table public.plans add constraint plans_end_date_check check(end_date>=date);

alter table public.appointments
  add column if not exists end_date date;
update public.appointments set end_date=date where end_date is null;
alter table public.appointments alter column end_date set not null;
drop constraint if exists appointments_end_date_check;
alter table public.appointments add constraint appointments_end_date_check check(end_date>=date);

create index if not exists plans_date_range_idx on public.plans(date,end_date);
create index if not exists appointments_date_range_idx on public.appointments(date,end_date);

-- Requested team position titles. They are custom roles/position names,
-- while the actual department/team field remains โค้ด / เทคนิค / อุปกรณ์ / โลจิสติกส์ / ลีดเดอร์.
insert into public.custom_roles(name)
select x.name
from (values
 ('ประธานเชียร์'),
 ('รองประธานเชียร์'),
 ('ประธานฝ่ายโค้ด'),
 ('รองประธานฝ่ายโค้ด'),
 ('ประธานฝ่ายเทคนิค'),
 ('รองประธานฝ่ายเทคนิค'),
 ('ประธานฝ่ายอุปกรณ์'),
 ('รองประธานฝ่ายอุปกรณ์'),
 ('ประธานฝ่ายโลจิสติกส์'),
 ('รองประธานฝ่ายโลจิสติกส์'),
 ('ประธานฝ่ายลีดเดอร์'),
 ('รองประธานลีดเดอร์'),
 ('ศิษย์เก่า')
) as x(name)
where not exists (select 1 from public.custom_roles r where r.name=x.name);
