# ⚠️ ต้องตั้งค่าฐานข้อมูลก่อนใช้งาน Fulfillment System

## ปัญหา
ระบบ Fulfillment Queue ไม่สามารถทำงานได้เพราะขาดตาราง `fulfillment_tasks` และ `fulfillment_items` ในฐานข้อมูล

## วิธีแก้ไข (ใช้เวลา 2 นาที)

### ขั้นตอนที่ 1: เปิด Supabase SQL Editor
🔗 [คลิกที่นี่เพื่อเปิด SQL Editor](https://supabase.com/dashboard/project/ogrcpzzmmudztwjfwjvu/sql/new)

### ขั้นตอนที่ 2: คัดลอกไฟล์ SQL
เปิดไฟล์ `apply_fulfillment_system.sql` ในโฟลเดอร์ root ของโปรเจ็กต์

### ขั้นตอนที่ 3: รันคำสั่ง SQL
1. คัดลอกเนื้อหาทั้งหมดจากไฟล์ `apply_fulfillment_system.sql`
2. วางใน SQL Editor
3. กดปุ่ม **RUN** (หรือ Ctrl+Enter)

### ขั้นตอนที่ 4: Refresh หน้าเว็บ
กด F5 หรือรีเฟรชหน้าเว็บแอปพลิเคชัน

## สิ่งที่จะเกิดขึ้น
✅ สร้างตาราง `fulfillment_tasks` - เก็บรายการงานจัดสินค้า
✅ สร้างตาราง `fulfillment_items` - เก็บรายการสินค้าในแต่ละงาน
✅ สร้าง Indexes เพื่อเพิ่มความเร็ว
✅ ตั้งค่า RLS และ Triggers อัตโนมัติ

## หมายเหตุ
- คำสั่ง SQL ปลอดภัย ไม่ลบหรือแก้ไขข้อมูลที่มีอยู่
- ใช้ `CREATE TABLE IF NOT EXISTS` จึงรันซ้ำได้ไม่เกิด error
- ถ้ามีปัญหา ติดต่อทีมพัฒนา

## การแก้ไขอื่นๆ ที่ทำแล้ว
✅ แก้ไข `product_code` → `sku` ใน inventory_items queries
✅ แก้ไข `quantity` → `unit_level3_quantity` เพื่อใช้ระบบหน่วยหลายระดับ
✅ เพิ่มการตรวจสอบตารางก่อนใช้งาน พร้อมแสดงข้อความข้อผิดพลาดที่ชัดเจน
