# chownatui

Mobile-first team availability and work scheduling app built with React + Vite + Supabase.

## Features
- Supabase email/password authentication
- Member/Admin roles with RLS
- Explicit day status: ยังไม่ลงเวลา / ว่าง / ไม่ว่าง
- Status confirmation before saving
- Multiple availability intervals with job-overlap checks
- Team overview
- Monthly shared calendar for Sep-Oct 2026 with daily jobs
- Admin job management and member assignment
- Profile settings: display name, avatar, bio, password
- Vercel-ready

## Supabase setup
1. Run `supabase/schema.sql` if starting from scratch.
2. Run `supabase/migration-production.sql`.
3. Run `supabase/profile-settings.sql` once to enable avatars/bio.

## Vercel environment variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never put a Supabase secret/service-role key in the frontend.
