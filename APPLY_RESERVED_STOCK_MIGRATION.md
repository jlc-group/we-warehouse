# วิธีการ Apply Reserved Stock System Migration

## ขั้นตอนที่ 1: เข้า Supabase Dashboard

1. ไปที่ https://supabase.com/dashboard
2. เลือกโปรเจ็กต์ของคุณ
3. คลิก **SQL Editor** ในเมนูด้านซ้าย

## ขั้นตอนที่ 2: Copy Migration SQL

1. เปิดไฟล์: `supabase/migrations/20251012_add_reserved_stock_system.sql`
2. Copy เนื้อหาทั้งหมด (Ctrl+A, Ctrl+C)

## ขั้นตอนที่ 3: Run Migration

1. ใน SQL Editor, คลิก **New Query**
2. Paste SQL ที่ copy มา
3. คลิก **Run** (Ctrl+Enter)
4. รอจนกว่า Query จะเสร็จ (ประมาณ 5-10 วินาที)

## ขั้นตอนที่ 4: Verify สำเร็จ

รัน Query นี้เพื่อตรวจสอบ:

```sql
-- 1. ตรวจสอบตาราง stock_reservations ถูกสร้าง
SELECT COUNT(*) FROM public.stock_reservations;

-- 2. ตรวจสอบ View inventory_available
SELECT * FROM public.inventory_available LIMIT 5;

-- 3. ตรวจสอบ Functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('reserve_stock_safe', 'cancel_reservation', 'fulfill_reservation');

-- 4. ตรวจสอบคอลัมน์ใหม่ใน inventory_items
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'inventory_items'
  AND column_name LIKE 'reserved%';
```

### ✅ ผลลัพธ์ที่คาดหวัง:

1. **ตาราง stock_reservations**: `COUNT = 0` (ว่างเปล่า, เพิ่งสร้างใหม่)
2. **View inventory_available**: แสดงข้อมูลสต็อกพร้อม available_quantity
3. **Functions**: แสดง 3 functions
4. **คอลัมน์**: แสดง `reserved_quantity`, `reserved_level1_quantity`, `reserved_level2_quantity`, `reserved_level3_quantity`

## ขั้นตอนที่ 5: ทดสอบ Functions

```sql
-- ทดสอบ reserve_stock_safe (ใช้ inventory_item_id จริงจากฐานข้อมูล)
SELECT reserve_stock_safe(
  p_inventory_item_id := 'YOUR_INVENTORY_ITEM_ID_HERE',
  p_fulfillment_item_id := NULL,
  p_warehouse_code := 'A',
  p_location := 'A-01-01',
  p_level1_qty := 0,
  p_level2_qty := 0,
  p_level3_qty := 10,
  p_total_qty := 10,
  p_reserved_by := '00000000-0000-0000-0000-000000000000',
  p_notes := 'Test reservation'
);

-- ดู reservation ที่สร้าง
SELECT * FROM stock_reservations ORDER BY reserved_at DESC LIMIT 1;

-- Cancel reservation (ใช้ reservation_id ที่ได้จากด้านบน)
SELECT cancel_reservation(
  p_reservation_id := 'RESERVATION_ID_HERE',
  p_cancelled_by := '00000000-0000-0000-0000-000000000000'
);
```

## 🚨 หากเกิดข้อผิดพลาด

### Error: "column already exists"
- ปกติ - Migration จะข้ามคอลัมน์ที่มีอยู่แล้ว
- ไม่ต้องทำอะไร

### Error: "relation ... does not exist"
- แสดงว่าตาราง `inventory_items` หรือ `fulfillment_items` ไม่มี
- ตรวจสอบว่า database ถูกต้อง

### Error: "permission denied"
- คุณต้องเป็น Owner หรือมีสิทธิ์ ALTER TABLE
- ติดต่อ admin ของโปรเจ็กต์

## 📋 Checklist After Migration

- [ ] ตาราง `stock_reservations` ถูกสร้าง
- [ ] View `inventory_available` ทำงาน
- [ ] View `reservation_summary_by_warehouse` ทำงาน
- [ ] View `reservation_history` ทำงาน
- [ ] Function `reserve_stock_safe()` ทำงาน
- [ ] Function `cancel_reservation()` ทำงาน
- [ ] Function `fulfill_reservation()` ทำงาน
- [ ] คอลัมน์ `reserved_*` ถูกเพิ่มใน `inventory_items`
- [ ] ทดสอบ reserve → cancel flow สำเร็จ

## 🎉 เสร็จแล้ว!

หลังจาก migration สำเร็จ:
1. Refresh หน้า Browser
2. ไปที่ **Warehouse → Picking System**
3. ทดสอบการ Pick items
4. ตรวจสอบว่า reservation ถูกสร้างใน database

---

**ไฟล์ Migration**: `supabase/migrations/20251012_add_reserved_stock_system.sql`
