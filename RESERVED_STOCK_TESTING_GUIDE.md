# Reserved Stock System - Testing Guide

## 🎯 ภาพรวม

ระบบ Reserved Stock ช่วยให้คุณ "จอง" สต็อกก่อนจัดส่งจริง เพื่อป้องกันการจัดสินค้าซ้ำและให้ยกเลิกได้ง่าย

### Flow การทำงาน:
```
1. pending     → ยังไม่จอง (stock พร้อมใช้ทั้งหมด)
2. picked      → จองแล้ว (stock ถูก lock แต่ยังไม่หัก, ยกเลิกได้)
3. completed   → จัดส่งแล้ว (หักสต็อกจริง, ยกเลิกไม่ได้)
```

---

## 📋 Pre-requisites

### 1. Apply Database Migration
- ไปที่ https://supabase.com/dashboard
- SQL Editor → New Query
- Copy & Paste: `supabase/migrations/20251012_add_reserved_stock_system.sql`
- Run (Ctrl+Enter)
- ตรวจสอบ: ดูคำแนะนำใน `APPLY_RESERVED_STOCK_MIGRATION.md`

### 2. Verify Migration Success
```sql
-- ตรวจสอบตาราง stock_reservations
SELECT COUNT(*) FROM public.stock_reservations;

-- ตรวจสอบ View inventory_available
SELECT * FROM public.inventory_available LIMIT 5;

-- ตรวจสอบ Functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('reserve_stock_safe', 'cancel_reservation', 'fulfill_reservation');
```

---

## 🧪 Testing Scenarios

### Test 1: ดูสต็อกใน InventoryTable พร้อม Reserved & Available

1. เข้า **ตารางข้อมูล → รายการสต็อก**
2. ตรวจสอบคอลัมน์:
   - ✅ "รวม (ชิ้น)" - จำนวนสต็อกทั้งหมด
   - ✅ "จองแล้ว" - จำนวนที่ถูกจอง (มีไอคอน 🔒 สีส้ม)
   - ✅ "พร้อมใช้" - Available = Total - Reserved (สีเขียว)

**Expected Result:**
- ถ้ายังไม่มีการจอง: "จองแล้ว" จะแสดง "-"
- ถ้ามีการจอง: แสดงจำนวนและ Badge "กำลังจอง"
- Tooltip: "สต็อกที่ถูกจอง (ยังยกเลิกได้)"

---

### Test 2: สร้าง Reservation ผ่าน Picking System

#### Step 1: เตรียมข้อมูล
1. ตรวจสอบว่ามี fulfillment_tasks พร้อม status = 'pending'
2. ถ้าไม่มี สร้าง Purchase Order ใหม่ที่ **ใบสั่งซื้อ → ใบสั่งขาย**

#### Step 2: Pick Items
1. ไปที่ **คลังสินค้า → Inbound/Outbound → Warehouse Picking**
2. เลือก Task ที่ต้องการจัดสินค้า
3. คลิก "เริ่มจัดสินค้า"
4. เลือก Location ที่มีสต็อก
5. คลิก "จอง" (Pick)

**Expected Result:**
- ✅ แจ้งเตือน: "✅ จองสต็อกสำเร็จ (ยังยกเลิกได้)"
- ✅ สถานะเปลี่ยนเป็น "Picked"
- ✅ Database: สร้าง record ใน `stock_reservations` (status = 'active')
- ✅ InventoryTable: คอลัมน์ "จองแล้ว" เพิ่มขึ้น, "พร้อมใช้" ลดลง

#### Verify in Database:
```sql
-- ดู reservation ล่าสุด
SELECT * FROM stock_reservations ORDER BY reserved_at DESC LIMIT 5;

-- ดู inventory_items (reserved_quantity ควรเพิ่มขึ้น)
SELECT
  product_name,
  quantity,
  reserved_quantity,
  (quantity - reserved_quantity) AS available
FROM inventory_items
WHERE reserved_quantity > 0;
```

---

### Test 3: ยกเลิก Reservation

1. ในหน้า Picking System (ต่อจาก Test 2)
2. คลิกปุ่ม "❌ ยกเลิก" ที่รายการที่จองไว้
3. ยืนยัน

**Expected Result:**
- ✅ แจ้งเตือน: "✅ ยกเลิกสำเร็จ และคืนสต็อกแล้ว"
- ✅ สถานะกลับเป็น "Pending"
- ✅ Database: `stock_reservations.status = 'cancelled'`
- ✅ `inventory_items.reserved_quantity` ลดลง (คืนสต็อก)
- ✅ InventoryTable: "จองแล้ว" ลดลง, "พร้อมใช้" เพิ่มขึ้น

---

### Test 4: Confirm Shipment (Fulfill Reservation)

1. Pick items (Test 2)
2. คลิก "🚚 ยืนยันการจัดส่ง"
3. ยืนยัน

**Expected Result:**
- ✅ แจ้งเตือน: "🎉 ยืนยันการจัดส่งสำเร็จ - หักสต็อกและพร้อมส่งมอบ"
- ✅ สถานะเปลี่ยนเป็น "Shipped"
- ✅ Database: `stock_reservations.status = 'fulfilled'`
- ✅ `inventory_items.quantity` ลดลง (หักสต็อกจริง)
- ✅ `inventory_items.reserved_quantity` ลดลง (release reservation)
- ✅ InventoryTable: "รวม (ชิ้น)" ลดลง, "จองแล้ว" ลดลง

#### Verify:
```sql
-- ดู reservation ที่ fulfilled
SELECT * FROM stock_reservations WHERE status = 'fulfilled' ORDER BY fulfilled_at DESC LIMIT 5;

-- ตรวจสอบสต็อกถูกหักจริง
SELECT product_name, quantity, reserved_quantity FROM inventory_items WHERE id = 'YOUR_INVENTORY_ITEM_ID';
```

---

### Test 5: Reserved Stock Dashboard

1. ไปที่ **เครื่องมือ → 🔒 Reserved Stock**

**Check Summary Cards:**
- ✅ "การจองทั้งหมด" - จำนวน active reservations
- ✅ "สต็อกที่ถูกจอง" - total reserved quantity
- ✅ "Warehouses ที่มีการจอง"

**Check Summary by Warehouse Table:**
- ✅ แสดง active reservations แยกตาม warehouse
- ✅ Total reserved quantity ถูกต้อง

**Check Tabs:**
- ✅ **กำลังจอง**: แสดง active reservations (สถานะ "กำลังจอง" สีส้ม)
- ✅ **ทั้งหมด**: แสดง all reservations
- ✅ **ประวัติ**: แสดง fulfilled/cancelled reservations

**Test Cancel from Dashboard:**
1. Tab "กำลังจอง"
2. คลิกปุ่ม "❌ ยกเลิก" ที่รายการใดๆ
3. ยืนยัน

**Expected Result:**
- ✅ แจ้งเตือน: "✅ ยกเลิกสำเร็จ"
- ✅ รายการหายจาก tab "กำลังจอง"
- ✅ สต็อกถูกคืนทันที

---

## 🔍 Troubleshooting

### ปัญหา: Migration ล้มเหลว
**Solution:**
- ตรวจสอบว่า table `inventory_items` และ `fulfillment_items` มีอยู่
- ตรวจสอบ permissions (ต้องเป็น Owner หรือมี ALTER TABLE)
- ดูรายละเอียดใน `APPLY_RESERVED_STOCK_MIGRATION.md`

### ปัญหา: Pick ไม่สำเร็จ (Error)
**Possible Causes:**
- Stock ไม่พอ (available_quantity < requested)
- `fulfillment_item_id` ไม่ถูกต้อง
- Function `reserve_stock_safe` ไม่ทำงาน

**Debug:**
```sql
-- ตรวจสอบว่า function มีอยู่
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'reserve_stock_safe';

-- ทดสอบ function โดยตรง
SELECT reserve_stock_safe(
  p_inventory_item_id := 'YOUR_ID',
  p_fulfillment_item_id := NULL,
  p_warehouse_code := 'A',
  p_location := 'A-01-01',
  p_level1_qty := 0,
  p_level2_qty := 0,
  p_level3_qty := 10,
  p_total_qty := 10,
  p_reserved_by := '00000000-0000-0000-0000-000000000000',
  p_notes := 'Test'
);
```

### ปัญหา: Reserved quantity ไม่อัปเดตใน UI
**Solution:**
- Refresh หน้า Browser (Ctrl+R)
- ตรวจสอบ `inventory_available` view:
```sql
SELECT * FROM inventory_available WHERE id = 'YOUR_INVENTORY_ITEM_ID';
```

### ปัญหา: Cancel ไม่ได้ (Error)
**Possible Causes:**
- Reservation ถูก fulfill แล้ว (status = 'fulfilled')
- `reservation_id` ไม่ถูกต้อง

**Debug:**
```sql
SELECT * FROM stock_reservations WHERE id = 'YOUR_RESERVATION_ID';
```

---

## ✅ Testing Checklist

- [ ] Migration applied successfully
- [ ] View `inventory_available` ทำงาน
- [ ] Functions ทั้ง 3 ตัวทำงาน
- [ ] InventoryTable แสดงคอลัมน์ "จองแล้ว" และ "พร้อมใช้"
- [ ] Pick item → สร้าง reservation สำเร็จ
- [ ] Cancel pick → release reservation สำเร็จ
- [ ] Confirm shipment → fulfill reservation และหักสต็อก
- [ ] Reserved Stock Dashboard แสดงข้อมูลถูกต้อง
- [ ] Cancel จาก Dashboard ทำงาน
- [ ] Available stock คำนวณถูกต้อง (Total - Reserved)

---

## 📊 Monitoring Queries

### ดู Active Reservations ทั้งหมด
```sql
SELECT * FROM reservation_history WHERE status = 'active' ORDER BY reserved_at DESC;
```

### ดู Inventory Items ที่มีการจอง
```sql
SELECT
  product_name,
  location,
  quantity AS total,
  reserved_quantity AS reserved,
  (quantity - reserved_quantity) AS available
FROM inventory_available
WHERE reserved_quantity > 0
ORDER BY reserved_quantity DESC;
```

### สรุปการจองแยกตาม Warehouse
```sql
SELECT * FROM reservation_summary_by_warehouse;
```

### ตรวจสอบประวัติการจอง (24 ชั่วโมงล่าสุด)
```sql
SELECT
  product_name,
  location,
  reserved_total_quantity,
  status,
  reserved_at,
  fulfilled_at,
  cancelled_at
FROM reservation_history
WHERE reserved_at > NOW() - INTERVAL '24 hours'
ORDER BY reserved_at DESC;
```

---

## 🎉 Success Criteria

ระบบจะถือว่าใช้งานได้เมื่อ:

1. ✅ Pick item สร้าง reservation (ไม่หักสต็อกทันที)
2. ✅ Cancel pick คืนสต็อกอัตโนมัติ
3. ✅ Confirm shipment หักสต็อกจริง
4. ✅ Available stock = Total - Reserved (ตลอดเวลา)
5. ✅ UI แสดงข้อมูล reserved stock ครบถ้วน
6. ✅ Dashboard แสดงและจัดการ reservations ได้

---

**Happy Testing! 🚀**
