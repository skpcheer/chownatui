CHOWNATUI v2.9.2 — Layout + Role Fix

1. Run supabase/migration-v29-2-layout-role-fix.sql in Supabase SQL Editor.
2. This patch uses the existing layout_configs.target column; it does not use key.
3. Then deploy this source to GitHub/Vercel.
4. Do not drop tables or delete existing member/attendance data.
