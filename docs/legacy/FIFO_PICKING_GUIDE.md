# 📦 FIFO Picking System Guide

## 🎯 สรุปการทำงาน

ระบบ Picking Plan ใช้หลักการ **FIFO (First In First Out)** - **เข้าก่อน ออกก่อน**

---

## 🔄 Logic การเลือก Picking (ปัจจุบัน)

### **เกณฑ์การเรียงลำดับ (PRIORITY):**

```
1️⃣ วันที่รับสินค้าเข้า (received_date)  ← เก่าที่สุดก่อน 🔴 สำคัญสุด!
2️⃣ หมายเลข LOT (lot_number)           ← ถ้าวันเดียวกัน
3️⃣ ตำแหน่งในคลัง (Location)            ← สุดท้าย
   - Zone (A, B, C...)
   - Position (1, 2, 3...)
   - Level (1, 2, 3, 4)
```

### **ตัวอย่าง:**

| LOT Number | Received Date | Location | จัดลำดับ |
|------------|---------------|----------|---------|
| ABC-250105-001 | 2025-01-05 | A1/1 | **1** ← หยิบก่อน (เก่าสุด) |
| ABC-250107-002 | 2025-01-07 | B1/1 | 2 |
| ABC-250107-003 | 2025-01-07 | A2/1 | 3 (วันเดียวกัน แต่ LOT หลัง) |
| ABC-250109-001 | 2025-01-09 | A1/2 | 4 |

---

## 📊 ข้อมูลที่ระบบใช้

### **Database Fields (inventory_items):**

```sql
-- FIFO Tracking Fields
lot_number         VARCHAR(50)   -- หมายเลข LOT: SKU-YYMMDD-001
received_date      TIMESTAMP     -- วันที่รับเข้าคลัง (FIFO key)
expiry_date        DATE          -- วันหมดอายุ
manufacturing_date DATE          -- วันผลิต
batch_code         VARCHAR(50)   -- รหัส Batch จากโรงงาน
```

### **Auto-generate LOT Number:**

```sql
SELECT generate_lot_number('JHD1-70G');
-- Output: JHD1-70G-250109-001
```

รูปแบบ: `{SKU}-{YYMMDD}-{SEQUENCE}`

---

## 🛠 การใช้งาน

### **1. รัน Migration (เพิ่มฟิลด์ LOT):**

```bash
# ใน Supabase SQL Editor
-- รันไฟล์นี้:
supabase/migrations/20250109_add_lot_fifo_fields.sql
```

### **2. ระบบทำงานอัตโนมัติ:**

```typescript
// Algorithm จะเรียงตาม received_date อัตโนมัติ
const sortedLocations = sortLocationsByFIFO(pickingLocations);

// FIFO Logic ใน /src/utils/pickingAlgorithm.ts
```

### **3. แสดงผลใน UI:**

```
📋 Picking Plan Modal:
┌─────────────────────────────────────────────────────┐
│ Location │ LOT            │ วันที่รับ │ หยิบ       │
│──────────│────────────────│───────────│────────────│
│ A1/1     │ ABC-250105-001 │ 05/01/25  │ 100 ✓     │ ← เก่าสุด
│ A2/1     │ ABC-250107-002 │ 07/01/25  │ 50        │
│ B1/1     │ ABC-250109-001 │ 09/01/25  │ 30        │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 ประโยชน์ของ FIFO

### ✅ **ข้อดี:**

1. **ป้องกันของเสีย** - หมดอายุก่อนออกก่อน
2. **ตรงตามมาตรฐาน** - GMP, HACCP, ISO
3. **ลดต้นทุน** - ไม่ต้องตัดขาดทุนสินค้าหมดอายุ
4. **โปร่งใส** - Trace ย้อนกลับได้ว่าขายของ LOT ไหนไป

### 📌 **Use Cases:**

- ✅ สินค้ามีวันหมดอายุ (อาหาร, เครื่องสำอาง, ยา)
- ✅ สินค้าที่ต้อง Lot Tracking
- ✅ ปฏิบัติตาม GMP/ISO

---

## 🗂 ไฟล์ที่เกี่ยวข้อง

```
/supabase/migrations/
  └─ 20250109_add_lot_fifo_fields.sql   ← Database migration

/src/utils/
  └─ pickingAlgorithm.ts                 ← FIFO logic

/src/components/picking/
  └─ PickingPlanModal.tsx                ← UI แสดง LOT
```

---

## 🔍 Views สำหรับ Reporting

### **1. ดูสินค้าใกล้หมดอายุ:**

```sql
SELECT * FROM inventory_expiring_soon;
-- แสดงสินค้าที่หมดอายุภายใน 90 วัน
```

### **2. ดูลำดับ FIFO:**

```sql
SELECT * FROM inventory_fifo_order
WHERE sku = 'JHD1-70G';
-- แสดงลำดับการหยิบตาม FIFO พร้อม fifo_sequence
```

---

## 🚀 การพัฒนาต่อ

### **แนะนำเพิ่มเติม:**

1. **Alert หมดอายุใกล้** - แจ้งเตือน 30 วันก่อนหมดอายุ
2. **Barcode Scanning** - สแกน LOT เพื่อ Verify
3. **Lot Traceability Report** - รายงาน trace ย้อนกลับ
4. **Auto LOT generation** - สร้าง LOT อัตโนมัติตอนรับของ

---

## 📞 Support

หากมีปัญหา ตรวจสอบ:
1. Migration รันสำเร็จหรือยัง?
2. ข้อมูล inventory_items มี `received_date` ครบหรือไม่?
3. ตรวจสอบ Console log ว่า FIFO sorting ทำงานถูกต้องหรือไม่

---

## 🎓 สรุป

> **FIFO = เข้าก่อน ออกก่อน**  
> ระบบจะหยิบจาก LOT ที่ **received_date เก่าที่สุด** ก่อนเสมอ

**ไม่ต้องกังวล! ระบบจัดการให้อัตโนมัติ 🎉**
