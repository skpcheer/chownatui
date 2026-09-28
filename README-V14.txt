CHOWNATUI V14

- Keeps V13 auth behavior. Email confirmation can remain disabled in Supabase.
- Adds a team invite code field during signup.
- Default code: CHOWNATUI888.
- To change it, set VITE_CHOWNATUI_TEAM_CODE in Vercel Project Settings > Environment Variables, then redeploy.
- This code is a convenience gate, not a secret security boundary, because frontend environment values are shipped to the browser.

V15 MANAGEMENT UPDATE
- หัวหน้าตุ้ย และ อาจารย์ตุ้ย จัดการฝ่ายและยศได้
- เพิ่มยศระบบ "อาจารย์ตุ้ย" ซึ่งมีสิทธิ์เทียบเท่าหัวหน้าตุ้ย
- เพิ่มยศกำหนดเอง และกำหนดให้สมาชิกได้
- เพิ่ม/แก้ไข/ลบฝ่ายผ่านหน้า จัดการตุ้ย > ฝ่าย
- สถิติเช็คชื่อมีปุ่ม "พิมพ์ A4" สำหรับพิมพ์รายชื่อพร้อมสถานะ โดยจัดหน้า A4 ให้เอง
- ช่องรหัสเข้าทีมตอนสมัครสมาชิกเป็นช่องว่าง ไม่มีการโชว์ CHOWNATUI888 แต่ระบบยังตรวจรหัสจริงตามค่า VITE_CHOWNATUI_TEAM_CODE (ค่าเริ่มต้น CHOWNATUI888)

IMPORTANT: Run supabase/migration-v15-management.sql in Supabase SQL Editor before using the new management features.
