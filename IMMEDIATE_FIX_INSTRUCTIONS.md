# 🚨 แก้ปัญหาทันที - ข้อมูลไม่แสดง

## ปัญหาที่เห็น
```
Could not find the function public.get_all_inventory_bypass_rls
Direct query result: {data: Array(0), error: null, count: 0}
```

## วิธีแก้ไขทันที (ใช้เวลา 1-2 นาที)

### ขั้นตอนที่ 1: เข้า Supabase Dashboard
1. ไปที่ https://supabase.com
2. เข้าสู่ระบบและเลือกโครงการ `ogrcpzzmmudztwjfwjvu`

### ขั้นตอนที่ 2: รัน Quick Fix (แนะนำ)
1. ไปที่ **SQL Editor** ในแถบซ้าย
2. คลิก **New Query**
3. **คัดลอกและวางโค้ดนี้:**

```sql
-- QUICK FIX: Disable RLS completely for immediate results
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
GRANT ALL ON inventory_items TO anon;
GRANT USAGE ON SEQUENCE inventory_items_id_seq TO anon;
```

4. คลิก **Run**
5. **รีเฟรช** หน้าเว็บ http://localhost:8080/ ทันที

### ผลลัพธ์ที่คาดหวัง
- ข้อมูลเก่าจะแสดงขึ้นมาทันที
- Console จะแสดง `Direct query successful: X` (X > 0)
- ไม่มี error PGRST202

## หากยังไม่ได้ผล (Plan B)
หาก Quick Fix ไม่ช่วย ให้รันโค้ดจาก `COMPREHENSIVE_FIX.sql` แทน

## การตรวจสอบ
- [ ] เปิด Developer Tools (F12)
- [ ] ไปที่ Console tab
- [ ] รีเฟรชหน้าเว็บ (Ctrl+F5)
- [ ] ควรเห็น "Direct query successful" แทนที่จะเป็น Array(0)

## หมายเหตุ
Quick Fix นี้จะปิด security ทั้งหมดสำหรับตาราง inventory_items ซึ่งเหมาะสำหรับ internal tools ที่ไม่ต้องการความปลอดภัยสูง