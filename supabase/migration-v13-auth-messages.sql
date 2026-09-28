-- V13: allow the login screen to distinguish an unknown email from a wrong password.
-- IMPORTANT: This intentionally exposes whether an email exists to anonymous callers.
-- Use this only for a trusted/internal app such as chownatui.

create or replace function public.email_exists(check_email text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(check_email))
  );
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;
