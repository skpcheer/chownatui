# chownatui

เว็บจัดการเวลาทีม + งาน สำหรับช่วงวันที่ 27 ก.ย. 2026 ถึง 31 ต.ค. 2026

## Stack
- React + Vite
- Supabase Auth + Postgres + RLS
- Vercel

## Environment variables
Create `.env.local` for local development:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use the same two variables in Vercel Project Settings → Environment Variables.
Never put a Supabase secret/service_role key in this frontend.

## Supabase setup
1. Run the original `supabase/schema.sql` once if the database is empty.
2. Run `supabase/migration-production.sql` once to harden role permissions and enforce no availability/job overlaps.
3. Create your first Auth user.
4. Promote that account to Admin in SQL Editor:

```sql
update public.profiles
set role='admin'
where email='YOUR_EMAIL';
```

## Local run

```bash
npm install
npm run dev
```

## Vercel
Import the repository into Vercel, set the two environment variables above, then deploy.
The included `vercel.json` rewrites all routes to `index.html` for the Vite SPA.
