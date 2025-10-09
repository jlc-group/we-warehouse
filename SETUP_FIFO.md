# 🚀 Setup FIFO System - ขั้นตอนการติดตั้ง

## ⚠️ สถานะปัจจุบัน

✅ **Code พร้อมแล้ว** - FIFO logic ถูก implement เสร็จแล้ว  
❌ **Database ยังไม่พร้อม** - ต้องรัน migration ก่อน

---

## 📋 ขั้นตอนการติดตั้ง (3 ขั้นตอน)

### **ขั้นที่ 1: รัน Migration ใน Supabase** 🗄️

1. เปิด **Supabase Dashboard**: https://supabase.com/dashboard
2. เลือก Project: `we-warehouse`
3. ไปที่ **SQL Editor** (เมนูซ้าย)
4. คลิก **New Query**
5. Copy & Paste ไฟล์นี้:

```bash
/supabase/migrations/20250109_add_lot_fifo_fields.sql
```

6. กด **Run** (หรือ Ctrl/Cmd + Enter)
7. รอจนเห็น `Success` ✅

---

### **ขั้นที่ 2: Uncomment LOT Query** 📝

หลังรัน migration แล้ว ให้แก้ไฟล์นี้:

**File:** `/src/components/picking/PickingPlanModal.tsx`

**บรรทัดที่ 103-108** เปลี่ยนจาก:

```typescript
// ดึงข้อมูล Inventory จาก Supabase
// Note: LOT fields (lot_number, received_date, etc.) จะใช้งานได้หลังรัน migration
const { data: inventoryData, error } = await supabase
  .from('inventory_items')
  .select('id, sku, product_name, location, unit_level1_quantity, unit_level1_rate, unit_level2_quantity, unit_level2_rate, unit_level3_quantity, unit_level1_name, unit_level2_name, unit_level3_name, warehouse_id')
  .or('unit_level1_quantity.gt.0,unit_level2_quantity.gt.0,unit_level3_quantity.gt.0'); // เฉพาะที่มีของอยู่
```

**เป็น:**

```typescript
// ดึงข้อมูล Inventory จาก Supabase (รวม LOT และ FIFO data)
const { data: inventoryData, error } = await supabase
  .from('inventory_items')
  .select('id, sku, product_name, location, unit_level1_quantity, unit_level1_rate, unit_level2_quantity, unit_level2_rate, unit_level3_quantity, unit_level1_name, unit_level2_name, unit_level3_name, warehouse_id, lot_number, received_date, expiry_date, manufacturing_date')
  .or('unit_level1_quantity.gt.0,unit_level2_quantity.gt.0,unit_level3_quantity.gt.0')
  .order('received_date', { ascending: true }); // เรียงตาม FIFO
```

---

### **ขั้นที่ 3: ทดสอบ** ✅

1. Refresh browser (Ctrl/Cmd + Shift + R)
2. ไปที่ **Packing List**
3. คลิก **ดูแผนการหยิบสินค้า (Picking Plan)**
4. ตรวจสอบว่า:
   - ✅ มีคอลัมน์ **LOT** และ **วันที่รับ**
   - ✅ เรียงตาม **วันที่เก่าสุดก่อน** (FIFO)

---

## 🎯 วิธีใช้งาน FIFO

### **สร้าง LOT Number อัตโนมัติ:**

```sql
-- ใน Supabase SQL Editor
SELECT generate_lot_number('JHD1-70G');
-- ผลลัพธ์: JHD1-70G-250109-001
```

### **ดูสินค้าใกล้หมดอายุ:**

```sql
SELECT * FROM inventory_expiring_soon;
-- แสดงสินค้าที่หมดอายุภายใน 90 วัน
```

### **ดูลำดับ FIFO:**

```sql
SELECT 
  sku,
  lot_number,
  received_date,
  location,
  fifo_sequence
FROM inventory_fifo_order
WHERE sku = 'JHD1-70G'
ORDER BY fifo_sequence;
```

---

## 🔍 Troubleshooting

### ❌ **Error: column "lot_number" does not exist**

**สาเหตุ:** ยังไม่รัน migration

**แก้:** รัน migration ตามขั้นที่ 1

---

### ❌ **ไม่เห็นคอลัมน์ LOT ใน UI**

**สาเหตุ:** ยังไม่ uncomment query

**แก้:** ทำตามขั้นที่ 2

---

### ❌ **LOT Number เป็น null**

**สาเหตุ:** ข้อมูลเก่ายังไม่มี LOT

**แก้:** 
```sql
-- Update existing data
UPDATE inventory_items
SET 
  lot_number = generate_lot_number(sku),
  received_date = created_at
WHERE lot_number IS NULL;
```

---

## 📊 ตัวอย่างผลลัพธ์

### **ก่อนใช้ FIFO:**
```
A1/1 → A2/1 → B1/1 → C1/1
(เรียงตาม Location)
```

### **หลังใช้ FIFO:**
```
05/01/25 (C1/1) → 07/01/25 (A1/1) → 09/01/25 (B1/1)
(เรียงตาม วันที่รับเข้า - เก่าก่อน)
```

---

## 📚 อ่านเพิ่มเติม

- **คู่มือ FIFO ฉบับเต็ม:** `FIFO_PICKING_GUIDE.md`
- **Migration File:** `/supabase/migrations/20250109_add_lot_fifo_fields.sql`
- **Algorithm:** `/src/utils/pickingAlgorithm.ts`

---

## ✅ Checklist

- [ ] รัน migration ใน Supabase
- [ ] Uncomment LOT query ใน PickingPlanModal.tsx
- [ ] Refresh browser
- [ ] ทดสอบ Picking Plan
- [ ] ตรวจสอบว่าเรียงตาม FIFO

---

## 🎉 เสร็จแล้ว!

เมื่อทำครบทุกขั้นตอน คุณจะมีระบบ FIFO ที่:
- ✅ หยิบของเก่าก่อนอัตโนมัติ
- ✅ Track LOT Number ได้
- ✅ แจ้งเตือนของใกล้หมดอายุ
- ✅ รายงาน FIFO ครบถ้วน

**Happy Picking! 📦**
