-- chownatui v2.2: multi-set cleaning duties + in-app notifications
-- Run this migration in Supabase SQL Editor after the previous migrations.

-- Allow more than one cleaning-duty set on the same day.
alter table public.cleaning_duties drop constraint if exists cleaning_duties_date_key;
alter table public.cleaning_duties add column if not exists set_name text not null default 'ชุดที่ 1';
create index if not exists cleaning_duties_date_idx on public.cleaning_duties(date);

-- In-app notifications. Cleaning-duty assignments use this table.
create table if not exists public.notifications(
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  created_by uuid references public.profiles(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notifications read own" on public.notifications;
drop policy if exists "notifications create deputy" on public.notifications;
drop policy if exists "notifications update own" on public.notifications;
create policy "notifications read own" on public.notifications
  for select to authenticated using(recipient_id=auth.uid());
create policy "notifications create deputy" on public.notifications
  for insert to authenticated
  with check(public.is_deputy_or_head());
create policy "notifications update own" on public.notifications
  for update to authenticated
  using(recipient_id=auth.uid())
  with check(recipient_id=auth.uid());

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id,created_at desc);
