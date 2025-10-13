# 🧪 คู่มือทดสอบ Reserved Stock System ด้วย Mock Data

## ✅ ข้อดี: ไม่กระทบข้อมูลจริง!

ไฟล์นี้จะสร้างข้อมูลทดสอบที่:
- ✅ มี prefix "test-" ทั้งหมด → แยกจากข้อมูลจริง
- ✅ สร้าง Warehouse "TEST"
- ✅ สร้าง Product "TEST-001"
- ✅ สร้าง 3 Inventory Items (1000, 500, 100 ชิ้น)
- ✅ สร้าง 3 Reservations (active, fulfilled, cancelled)
- ✅ ลบง่าย: เพียง run cleanup query

---

## 📋 ขั้นตอนการทดสอบ

### 1️⃣ **สร้าง Mock Data**

1. เปิด **Supabase SQL Editor**:
   👉 https://supabase.com/dashboard/project/ogrcpzzmmudztwjfwjvu/sql/new

2. **Copy & Paste** ไฟล์:
   ```
   create-test-data.sql
   ```

3. **Run** (Cmd+Enter / Ctrl+Enter)

4. **ตรวจสอบผลลัพธ์**:
   ```
   Test Inventory Items: 3
   Test Reservations: 3
   Active Reservations: 1
   Fulfilled Reservations: 1
   Cancelled Reservations: 1
   ```

---

### 2️⃣ **ดูใน Reserved Stock Dashboard**

1. เปิดเว็บ: http://localhost:5173
2. คลิกแท็บ: **"🔧 เครื่องมือ"**
3. คลิก Sub-tab: **"🔒 Reserved Stock"**

**ที่คุณจะเห็น:**

#### 📊 Summary Cards:
- **การจองทั้งหมด**: 1 (active reservation)
- **สต็อกที่ถูกจอง**: 50 ชิ้น
- **Warehouses**: 1 (TEST warehouse)

#### 📋 Summary by Warehouse Table:
| Warehouse | Active Reservations | Total Reserved |
|-----------|---------------------|----------------|
| TEST      | 1                   | 50             |

#### 🔖 Tabs:
- **Tab "กำลังจอง"**: จะเห็น 1 รายการ
  - สินค้า: TEST - สินค้าทดสอบระบบจองสต็อก
  - Location: TEST-A01-01
  - จำนวน: 50 ชิ้น
  - สถานะ: กำลังจอง (สีส้ม)
  - ✅ มีปุ่ม "ยกเลิก"

- **Tab "ทั้งหมด"**: จะเห็น 3 รายการ (active + fulfilled + cancelled)

- **Tab "ประวัติ"**: จะเห็น 2 รายการ (fulfilled + cancelled)

---

### 3️⃣ **ดูใน Inventory Table**

1. คลิกแท็บ: **"📊 ตารางข้อมูล"**
2. คลิก Sub-tab: **"รายการสต็อก"**
3. เลื่อนหา: **"TEST - สินค้าทดสอบระบบจองสต็อก"**

**ที่คุณจะเห็น:**

| สินค้า | Location | รวม (ชิ้น) | จองแล้ว 🔒 | พร้อมใช้ ✅ |
|--------|----------|------------|------------|-------------|
| TEST - ... | TEST-A01-01 | 1,000 | **50** (สีส้ม) | **950** (สีเขียว) |
| TEST - ... | TEST-A01-02 | 500 | 0 | 500 |
| TEST - ... | TEST-A01-03 | 100 | 0 | 100 |

---

### 4️⃣ **ทดสอบการยกเลิก Reservation**

#### จาก Dashboard:
1. ไปที่ **เครื่องมือ → 🔒 Reserved Stock**
2. Tab **"กำลังจอง"**
3. คลิกปุ่ม **"❌ ยกเลิก"** ที่รายการ TEST
4. ยืนยัน

**ผลลัพธ์:**
- ✅ รายการหายจาก Tab "กำลังจอง"
- ✅ ไปปรากฏใน Tab "ประวัติ" (สถานะ: ยกเลิกแล้ว)
- ✅ Inventory Table: "จองแล้ว" กลับเป็น 0, "พร้อมใช้" กลับเป็น 1,000

#### จาก SQL:
```sql
-- ดูสถานะก่อนยกเลิก
SELECT status, reserved_quantity FROM stock_reservations WHERE id = 'test-reservation-001';
-- Result: status = 'active', reserved_quantity = 50

-- ยกเลิก
SELECT cancel_reservation('test-reservation-001', NULL);

-- ดูสถานะหลังยกเลิก
SELECT status, cancelled_at FROM stock_reservations WHERE id = 'test-reservation-001';
-- Result: status = 'cancelled', cancelled_at = '2025-10-13 18:00:00'
```

---

### 5️⃣ **ทดสอบการสร้าง Reservation ใหม่**

#### จาก SQL:
```sql
-- สร้าง reservation ใหม่ (50 ชิ้น)
SELECT reserve_stock_safe(
  p_inventory_item_id := 'test-inventory-002',
  p_fulfillment_item_id := NULL,
  p_warehouse_code := 'TEST',
  p_location := 'TEST-A01-02',
  p_level1_qty := 0,
  p_level2_qty := 0,
  p_level3_qty := 50,
  p_total_qty := 50,
  p_reserved_by := NULL,
  p_notes := 'Manual test reservation'
);

-- ดู reservation ที่สร้าง
SELECT * FROM stock_reservations ORDER BY reserved_at DESC LIMIT 1;
```

**ผลลัพธ์:**
- ✅ Dashboard แสดง "การจองทั้งหมด: 2"
- ✅ Inventory: "จองแล้ว" ของ TEST-A01-02 เพิ่มเป็น 50

---

### 6️⃣ **ทดสอบการ Fulfill Reservation**

```sql
-- Get reservation ID
SELECT id FROM stock_reservations WHERE status = 'active' AND location = 'TEST-A01-02' LIMIT 1;
-- Example result: 'abc-123-def'

-- Fulfill
SELECT fulfill_reservation('abc-123-def', NULL);

-- ตรวจสอบ
SELECT
  total_base_quantity,
  reserved_quantity
FROM inventory_items
WHERE id = 'test-inventory-002';
```

**ผลลัพธ์:**
- ✅ `total_base_quantity` ลดลง: 500 → 450
- ✅ `reserved_quantity` กลับเป็น 0
- ✅ Status เปลี่ยนเป็น 'fulfilled'

---

## 🧹 **ลบข้อมูลทดสอบ (เมื่อเสร็จแล้ว)**

รัน SQL นี้ใน Supabase SQL Editor:

```sql
-- ลบ Test Data ทั้งหมด
DELETE FROM public.stock_reservations WHERE id LIKE 'test-%';
DELETE FROM public.inventory_items WHERE id LIKE 'test-%';
DELETE FROM public.products WHERE id LIKE 'test-%';
DELETE FROM public.warehouses WHERE id LIKE 'test-%';

-- ตรวจสอบ
SELECT 'Remaining Test Data' AS check, COUNT(*)
FROM public.stock_reservations
WHERE id LIKE 'test-%';
-- ควรได้ 0
```

---

## ✅ Checklist การทดสอบ

- [ ] สร้าง Mock Data สำเร็จ (3 items, 3 reservations)
- [ ] Dashboard แสดงข้อมูลถูกต้อง (Summary cards + tabs)
- [ ] Inventory Table แสดงคอลัมน์ "จองแล้ว" และ "พร้อมใช้"
- [ ] ยกเลิก reservation จาก UI สำเร็จ
- [ ] สร้าง reservation ใหม่ผ่าน SQL สำเร็จ
- [ ] Fulfill reservation และหักสต็อกสำเร็จ
- [ ] Available stock คำนวณถูกต้อง (Total - Reserved)
- [ ] ลบ Test Data เรียบร้อย

---

## 🎯 Scenarios ทดสอบเพิ่มเติม

### Scenario 1: จองสต็อกเกินที่มี
```sql
-- พยายามจอง 2000 ชิ้น (มีแค่ 1000)
SELECT reserve_stock_safe(
  p_inventory_item_id := 'test-inventory-001',
  p_fulfillment_item_id := NULL,
  p_warehouse_code := 'TEST',
  p_location := 'TEST-A01-01',
  p_level1_qty := 0,
  p_level2_qty := 0,
  p_level3_qty := 2000,
  p_total_qty := 2000,
  p_reserved_by := NULL,
  p_notes := 'Test insufficient stock'
);
```
**Expected**: ❌ Error "สต็อกไม่เพียงพอ (มี 950 ต้องการ 2000)"

### Scenario 2: ยกเลิก reservation ที่ไม่มี
```sql
SELECT cancel_reservation('fake-reservation-id', NULL);
```
**Expected**: ❌ Error "ไม่พบการจองหรือถูกยกเลิกแล้ว"

### Scenario 3: ยกเลิก reservation ซ้ำ
```sql
-- Cancel ครั้งแรก
SELECT cancel_reservation('test-reservation-001', NULL);
-- Cancel ครั้งที่ 2
SELECT cancel_reservation('test-reservation-001', NULL);
```
**Expected**: ❌ Error "ไม่พบการจองหรือถูกยกเลิกแล้ว" (ครั้งที่ 2)

---

## 📞 ถ้ามีปัญหา

1. **Dashboard ไม่แสดงข้อมูล**: Refresh หน้าเว็บ (Ctrl+R)
2. **ไม่เห็น Tab "Reserved Stock"**: ตรวจสอบว่า migration รันสำเร็จแล้ว
3. **Error ตอนสร้าง reservation**: ตรวจสอบว่า inventory_item_id ถูกต้อง
4. **Available stock ไม่ถูกต้อง**: ตรวจสอบ `inventory_available` view

---

**Happy Testing! 🚀**

ข้อมูลทดสอบทั้งหมดมี prefix "test-" สามารถลบได้ตลอดเวลา
