CHOWNATUI v2.9.2 — Layout & Member Management Update

Main changes in this build:
- Compact horizontal member cards on “สมาตุ้ยทั้งหมด”, 2 columns on desktop and 1 on narrow screens.
- Member directory order: ประธาน -> รองประธาน -> ประธานฝ่าย -> รองประธานฝ่าย -> ฝ่าย -> อาจารย์ -> ศิษย์เก่า.
- Check-in master member order now uses a locked normal view and a permission-gated “แก้ไขลำดับ” drag-and-drop mode.
- Shared avatar editor keeps the original uploaded file; the editor changes only display scale/position.
- Added “จัดการตุ้ย -> การแสดงผล” for separate layouts of the member directory and check-in member data.
- Layout fields can be shown/hidden, renamed, reordered, and custom fields can be added/removed without deleting stored member data.
- Added JSON custom fields to profiles and check-in members for future fields such as เลขประจำตัว.
- Only users with backend member-management permission can access the layout editor and member master controls.
- migration-v29-2.sql is idempotent and fixes the earlier policy-name mismatch for “plan topics manage”.

Migration:
Run supabase/migration-v29-2.sql after the previous migrations, including migration-v29-1-event-colors.sql.
