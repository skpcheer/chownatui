-- chownatui v2.9.1: event color support
-- Safe/idempotent: only adds nullable columns; existing data is preserved.

alter table public.plans
  add column if not exists color text;

alter table public.appointments
  add column if not exists color text;

-- Keep colors optional so old plans/appointments continue to work.
-- UI supplies a controlled palette for new/edited records.
