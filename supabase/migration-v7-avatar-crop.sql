-- Avatar crop position for profile pictures. Run once after the existing profile settings migrations.
alter table public.profiles add column if not exists avatar_y numeric not null default 0 check (avatar_y >= -50 and avatar_y <= 50);
