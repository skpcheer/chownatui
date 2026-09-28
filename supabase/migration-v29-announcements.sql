-- chownatui v2.9: announcements + public home carousel
-- Run after the previous migrations.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_url text,
  link_url text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "announcements read authenticated" on public.announcements;
drop policy if exists "announcements manage deputy" on public.announcements;

create policy "announcements read authenticated" on public.announcements
  for select to authenticated using (true);

create policy "announcements manage deputy" on public.announcements
  for all to authenticated
  using (public.is_deputy_or_head())
  with check (public.is_deputy_or_head());

create index if not exists announcements_created_idx
  on public.announcements(created_at desc);

-- Public bucket for announcement images. Only authenticated managers can write.
insert into storage.buckets(id,name,public)
values('announcement-images','announcement-images',true)
on conflict (id) do update set public=true;

drop policy if exists "announcement images public read" on storage.objects;
drop policy if exists "announcement images manager write" on storage.objects;
drop policy if exists "announcement images manager delete" on storage.objects;

create policy "announcement images public read" on storage.objects
  for select to public
  using (bucket_id='announcement-images');

create policy "announcement images manager write" on storage.objects
  for insert to authenticated
  with check (bucket_id='announcement-images' and public.is_deputy_or_head());

create policy "announcement images manager delete" on storage.objects
  for delete to authenticated
  using (bucket_id='announcement-images' and public.is_deputy_or_head());
