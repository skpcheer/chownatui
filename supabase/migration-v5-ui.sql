-- chownatui v5: unified UI data model updates

-- Long-term plan time is optional.
alter table public.plans alter column start_time drop not null;
alter table public.plans alter column end_time drop not null;

-- Appointment participants: selected users see the appointment as part of their work.
create table if not exists public.appointment_members(
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key(appointment_id,user_id)
);
alter table public.appointment_members enable row level security;
drop policy if exists "appointment members read" on public.appointment_members;
drop policy if exists "appointment members manage" on public.appointment_members;
create policy "appointment members read" on public.appointment_members for select to authenticated using(true);
create policy "appointment members manage" on public.appointment_members for all to authenticated using(public.is_deputy_or_head()) with check(public.is_deputy_or_head());

-- Existing plan-member assignments are no longer required by the UI; keep the table for backward compatibility.
