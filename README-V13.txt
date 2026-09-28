CHOWNATUI V13

Changes:
- Login shows 'รหัสผ่านไม่ถูกต้อง' when the email exists but the password is wrong.
- Login shows 'ไม่พบข้อมูลสมาชิก กรุณาสมัครสมาชิกก่อน' when the email does not exist.
- Signup no longer shows email-confirmation instructions.
- Removed the resend-confirmation action from the signup screen.
- Added supabase/migration-v13-auth-messages.sql for the email-exists check.

Supabase setup:
1. Authentication > Providers > Email: turn OFF 'Confirm email' / email confirmation.
2. Run migration-v13-auth-messages.sql in SQL Editor once.

Note: email_exists intentionally allows anonymous callers to check whether an email exists. This is suitable for a trusted internal team app, but it enables account enumeration.
