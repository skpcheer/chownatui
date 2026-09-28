-- chownatui profile settings: avatar + personal bio
-- Run this ONCE in Supabase SQL Editor.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public=true;

drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "avatars own insert" on storage.objects;
drop policy if exists "avatars own update" on storage.objects;
drop policy if exists "avatars own delete" on storage.objects;

create policy "avatars public read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

create policy "avatars own insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars own update"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars own delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Avatar zoom/crop scale for profile pictures
alter table public.profiles add column if not exists avatar_scale numeric not null default 1 check (avatar_scale >= 1 and avatar_scale <= 2.5);

-- Horizontal crop position for profile pictures (-50 left to 50 right)
alter table public.profiles add column if not exists avatar_x numeric not null default 0 check (avatar_x >= -50 and avatar_x <= 50);


-- Optional note for each availability interval
alter table public.availability add column if not exists notes text;

-- Avatar crop settings used by the profile crop dialog
alter table public.profiles add column if not exists avatar_scale numeric not null default 1 check (avatar_scale >= 1 and avatar_scale <= 2.5);
alter table public.profiles add column if not exists avatar_x numeric not null default 0 check (avatar_x >= -50 and avatar_x <= 50);
