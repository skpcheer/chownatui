# chownatui v4

React + Vite + Supabase team scheduling / cheer-team management app.

## สิ่งที่เพิ่มใน v4

- เมนูซ้ายใหม่: หน้าหลัก / ปฏิทิน / ลงเวลา / นัดหมาย / สมาตุ้ยทั้งหมด / จัดการตุ้ย / ตั้งค่า
- ฝ่าย: โค้ด / เทคนิค / อุปกรณ์ / โลจิสติกส์ / ลีดเดอร์
- ยศ: หัวหน้าตุ้ย / รองหัวตุ้ย / สมาตุ้ย
- รองหัวตุ้ยจัดการแผนงาน นัดหมาย เช็คชื่อ และเวรได้
- หัวหน้าตุ้ยจัดการยศและสมาชิกได้
- สมาตุ้ยดูข้อมูลทีมและลงเวลาว่างได้
- ลงเวลาว่างเป็นช่วงเวลา และตรวจชนกับแผนงานที่มอบหมาย
- นัดหมาย: ซ้อมน้อง / อยู่เย็น / นอนโรงเรียน / ถ่ายคลิป / อื่นๆ
- แผนงานระยะยาว: งานฝ่าย / งานหลัก / ซ้อมเชียร์
- แผนงานสร้างหัวข้อย่อยได้
- ซ้อมเชียร์กำหนดหน้าที่หลายคนต่อ 1 หน้าที่ได้
- ซ้อมเชียร์กำหนดช่วงเวลาว่าทำอะไรและหมายเหตุได้
- ปฏิทินแสดงงาน/นัดหมาย/แผนงานในวันที่เกี่ยวข้อง
- สมาตุ้ยทั้งหมดแสดงรูป ชื่อ แนะนำตัว ฝ่าย ยศ และเวลาว่าง
- เช็คชื่อ 3 แบบ: ซ้อมน้อง / อยู่เย็น / นอนโรงเรียน
- เช็คชื่อมีหมายเหตุและสถิติย้อนหลัง
- รายชื่อเช็คชื่อ 42 คนจากข้อมูลที่ให้มา
- แก้ข้อมูลคนเช็คชื่อ + รูป + เชื่อมกับบัญชีเว็บ
- เวรทำความสะอาด จันทร์–ศุกร์, สูงสุด 8 คน/วัน, หลายห้อง, สุ่มได้
- เพิ่มปุ่มส่งอีเมลยืนยันซ้ำหน้า signup
- รองรับ avatar storage

## วิธีติดตั้ง

1. ใช้โปรเจกต์เดิมบน Vercel ได้เลย
2. ใน Supabase เปิด SQL Editor แล้วรัน:
   - `supabase/migration-v4.sql`
3. ตั้งบัญชีหัวหน้าตุ้ยคนแรก หลังสร้างบัญชีแล้ว:
   ```sql
   update public.profiles set role='head' where email='YOUR_EMAIL';
   ```
4. Vercel Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Deploy ใหม่

## สำคัญเรื่องอีเมลยืนยัน

หน้า signup มีปุ่ม “ส่งอีเมลยืนยันอีกครั้ง” แล้ว แต่การส่งเมลจริงขึ้นกับ Supabase Auth / SMTP และ URL redirect ที่ตั้งไว้ใน Supabase

ใน Supabase:
- Authentication > URL Configuration
- เพิ่ม Production URL ของเว็บใน Site URL / Redirect URLs
- ตรวจ Email Provider และ SMTP ถ้าใช้ระบบส่งเมลแบบกำหนดเอง

## สิทธิ์

- หัวหน้าตุ้ย: จัดการสมาชิกและกำหนดยศ
- รองหัวตุ้ย: เพิ่ม/แก้แผนงาน นัดหมาย เช็คชื่อ และเวร
- สมาตุ้ย: ดูข้อมูลและลงเวลาว่าง

สิทธิ์สำคัญถูกบังคับด้วย Supabase RLS ไม่ได้พึ่งแค่การซ่อนปุ่มใน React

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

อย่าใส่ Supabase service-role key ใน frontend


## v5 UI / data migration
หลังจากรัน `migration-v4.sql` แล้ว ให้รัน `migration-v5-ui.sql` เพิ่มเติม เพื่อเปิดใช้:
- นัดหมายแบบเลือกผู้เข้าร่วม
- แผนงานระยะยาวที่ไม่บังคับเวลา
- UI ตัวเลือกวันที่แบบรวมปุ่มแสดงวันที่ + ลูกศร
- หน้าลงเวลาแบบกด “อัปเดตเวลาชีวิต” แล้วกรอกในหน้าต่าง
- แยกแท็บเช็คชื่อและเวรทำความสะอาดออกจาก “จัดการตุ้ย”

## v10 update
- Added profile birthday field and birthday greeting on the home page.
- Added select-all / clear-all participants in appointments.
- Changed all-member cards to a horizontal scroll layout.
- Added attendance history detail popup with filter buttons.
- Refined role and permissions management UI.

Before deploying, run `supabase/migration-v10-birthday.sql` in Supabase SQL Editor once.

## V20 planning update
Run `supabase/migration-v20-planning-range.sql` in Supabase SQL Editor before deploying V20. It adds end dates to plans/appointments and seeds the requested position titles.
