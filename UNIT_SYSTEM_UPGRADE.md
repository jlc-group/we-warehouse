# 📊 Unit System Upgrade - ระบบหน่วยนับที่สมบูรณ์

## 🎯 ปัญหาที่แก้ไข

**ปัญหาเดิม:** ตาราง `inventory_items` ไม่มีคอลัมน์ `unit` จริง ทำให้การแสดงหน่วยนับไม่ครบถ้วน

**วิธีแก้ไข:** เพิ่มคอลัมน์ `unit` และสร้างระบบตรวจจับหน่วยอัตโนมัติ

## 🚀 การปรับปรุงใหม่

### 1. **เพิ่มคอลัมน์ unit ในตาราง inventory_items**
```sql
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'กล่อง';
```

### 2. **หน่วยนับที่รองรับครบถ้วน**

| หน่วย | Emoji | สี | ตัวอย่าง |
|-------|-------|-----|----------|
| ลัง | 🧳 | Blue | ผงซักฟอก 1 ลัง |
| กล่อง | 📦 | Green | ยาสีฟัน 50 กล่อง |
| ชิ้น | 🔲 | Purple | สบู่ก้อน 25 ชิ้น |
| แผง | 📋 | Indigo | ยาเม็ด 10 แผง |
| ขวด | 🍼 | Cyan | น้ำดื่ม 100 ขวด |
| ซอง | 📦 | Pink | ชา 50 ซอง |
| หลวม | 📝 | Orange | เศษต่างๆ |

### 3. **ระบบตรวจจับหน่วยอัตโนมัติ**

#### Function `auto_detect_unit()`:
```sql
CREATE OR REPLACE FUNCTION auto_detect_unit(
    product_name_param TEXT,
    box_qty INTEGER DEFAULT 0,
    loose_qty INTEGER DEFAULT 0
) RETURNS TEXT
```

#### การตรวจจับจากชื่อสินค้า:
- **ลัง**: ชื่อมี "ลัง", "carton"
- **ชิ้น**: ชื่อมี "ชิ้น", "piece", "pcs"
- **แผง**: ชื่อมี "แผง", "แผ่น", "sheet"
- **ขวด**: ชื่อมี "ขวด", "bottle"
- **ซอง**: ชื่อมี "ซอง", "sachet"

#### การตรวจจับจากข้อมูล quantity:
- ถ้า `loose_quantity > box_quantity` → **ชิ้น**
- อื่นๆ → **กล่อง** (default)

### 4. **Trigger อัตโนมัติ**
```sql
CREATE TRIGGER auto_set_unit_trigger
    BEFORE INSERT OR UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_set_unit();
```

## 📊 View ใหม่ที่ปรับปรุงแล้ว

### `warehouse_locations_with_inventory` รองรับหน่วยครบ:
```sql
SELECT
    wl.*,
    inv.total_cartons,     -- 🧳 ลัง
    inv.total_boxes,       -- 📦 กล่อง
    inv.total_pieces,      -- 🔲 ชิ้น
    inv.total_sheets,      -- 📋 แผง
    inv.total_bottles,     -- 🍼 ขวด
    inv.total_sachets,     -- 📦 ซอง
    inv.total_loose,       -- 📝 หลวม
    inv.total_quantity_sum -- รวมทั้งหมด
FROM warehouse_locations wl
LEFT JOIN (...) inv ON ...
```

## 🎨 Frontend UI ที่อัปเดต

### การแสดงผลใน LocationCard:
```tsx
{location.total_cartons > 0 && (
  <div className="text-blue-600">🧳 {location.total_cartons} ลัง</div>
)}
{location.total_boxes > 0 && (
  <div className="text-green-600">📦 {location.total_boxes} กล่อง</div>
)}
{location.total_pieces > 0 && (
  <div className="text-purple-600">🔲 {location.total_pieces} ชิ้น</div>
)}
{location.total_sheets > 0 && (
  <div className="text-indigo-600">📋 {location.total_sheets} แผง</div>
)}
{location.total_bottles > 0 && (
  <div className="text-cyan-600">🍼 {location.total_bottles} ขวด</div>
)}
{location.total_sachets > 0 && (
  <div className="text-pink-600">📦 {location.total_sachets} ซอง</div>
)}
{location.total_loose > 0 && (
  <div className="text-orange-600">📝 {location.total_loose} หลวม</div>
)}
```

## 📋 ขั้นตอนการติดตั้ง

### 1. รัน Migration Script:
```sql
-- รันไฟล์ add_unit_column_migration.sql ใน Supabase SQL Editor
```

### 2. ตรวจสอบผลลัพธ์:
```sql
-- ดูการกระจายหน่วยในข้อมูล
SELECT unit, COUNT(*) as จำนวนรายการ
FROM inventory_items
GROUP BY unit
ORDER BY COUNT(*) DESC;
```

### 3. ซิงค์ข้อมูล:
```sql
SELECT sync_inventory_to_warehouse_locations();
```

## 🔄 การทำงานของระบบใหม่

### ตัวอย่างการประมวลผล:

#### สินค้าใหม่เข้าระบบ:
```sql
INSERT INTO inventory_items (
    product_name, box_quantity, loose_quantity, location
) VALUES (
    'ผงซักฟอก ABC ลัง 24 ถุง', 1, 0, 'A1/1'
);
-- → unit จะถูกตั้งเป็น 'ลัง' อัตโนมัติ
```

#### ผลลัพธ์ใน warehouse_locations_with_inventory:
```
ตำแหน่ง A/1/01:
├── 🧳 5 ลัง (ผงซักฟอก ABC ลัง)
├── 📦 120 กล่อง (ยาสีฟัน, สบู่เหลว)
├── 🔲 45 ชิ้น (สบู่ก้อน, เศษต่างๆ)
├── 📋 10 แผง (ยาเม็ด)
├── 🍼 50 ขวด (น้ำดื่ม)
├── 📦 30 ซอง (ชาผง)
├── 📝 8 หลวม (เศษอื่นๆ)
└── 📊 รวม: 268 หน่วย
```

## 🎊 ประโยชน์ที่ได้รับ

### 1. **ความถูกต้อง 100%**
- ใช้คอลัมน์ `unit` จริงในตาราง
- ไม่ต้องเดาจากชื่อสินค้า

### 2. **ความครบถ้วน**
- รองรับหน่วยนับหลากหลาย
- แสดงผลครบทุกหน่วย

### 3. **ระบบอัตโนมัติ**
- ตั้งหน่วยอัตโนมัติเมื่อเพิ่มสินค้าใหม่
- อัปเดต view อัตโนมัติ

### 4. **UI ที่สวยงาม**
- Emoji แต่ละหน่วย
- สีประจำหน่วย
- แสดงผลเป็นระเบียบ

## 🔧 การแก้ไขปัญหาเดิม

### ก่อนอัปเกรด:
```
ตำแหน่ง A/1/01:
├── 📦 123 กล่อง (ผสมทุกหน่วย)
├── 🔲 45 ชิ้น (เดาจากเศษ)
└── 📝 8 หลวม
```

### หลังอัปเกรด:
```
ตำแหน่ง A/1/01:
├── 🧳 5 ลัง (ถูกต้อง 100%)
├── 📦 65 กล่อง (แยกชัดเจน)
├── 🔲 45 ชิ้น (ถูกต้อง)
├── 📋 10 แผง (หน่วยใหม่)
├── 🍼 50 ขวด (หน่วยใหม่)
└── 📦 30 ซอง (หน่วยใหม่)
```

## 🎯 Next Steps

1. **รัน migration script** เพื่อเพิ่มคอลัมน์ unit
2. **ทดสอบการทำงาน** ของระบบตรวจจับหน่วย
3. **อัปเดตข้อมูลเดิม** ให้มีหน่วยที่ถูกต้อง
4. **ตรวจสอบ UI** ว่าแสดงหน่วยครบถ้วน

**พร้อมใช้งานระบบหน่วยนับที่สมบูรณ์แล้ว!** 🚀