# 🔧 Database Schema Fix

## ปัญหาที่พบ

Error: `column "unit" does not exist`

เนื่องจากตาราง `inventory_items` ไม่มีคอลัมน์ `unit` ตามที่ใช้ในโค้ด SQL

## Schema จริงของ inventory_items

จากไฟล์ `/src/integrations/supabase/types.ts`:

```typescript
inventory_items: {
  Row: {
    box_quantity: number
    created_at: string
    id: string
    location: string
    loose_quantity: number
    lot: string | null
    mfd: string | null
    product_name: string
    sku: string
    updated_at: string
    user_id: string | null
  }
}
```

**ไม่มีคอลัมน์ `unit`!**

## วิธีแก้ไข

### 1. ใช้ `product_name` เป็นตัวกำหนดหน่วย

แทนที่จะใช้คอลัมน์ `unit` ที่ไม่มี ให้ใช้ชื่อสินค้าเป็นตัวกำหนด:

```sql
-- เดิม (ผิด)
CASE WHEN unit = 'ลัง' THEN ...

-- ใหม่ (ถูกต้อง)
CASE WHEN LOWER(product_name) LIKE '%ลัง%' OR LOWER(product_name) LIKE '%carton%' THEN ...
```

### 2. เปลี่ยน `sku_code` เป็น `sku`

ตารางใช้ชื่อคอลัมน์ `sku` ไม่ใช่ `sku_code`

### 3. การตรวจสอบหน่วยจากชื่อสินค้า

```sql
CASE
    WHEN LOWER(product_name) LIKE '%ลัง%' OR LOWER(product_name) LIKE '%carton%' THEN 'ลัง'
    WHEN LOWER(product_name) LIKE '%ชิ้น%' OR LOWER(product_name) LIKE '%piece%' OR LOWER(product_name) LIKE '%pcs%' THEN 'ชิ้น'
    ELSE 'กล่อง'
END
```

## การเปลี่ยนแปลงใน complete_database_setup.sql

### ก่อนแก้ไข:
```sql
SUM(CASE WHEN unit = 'ลัง' THEN ... END) as total_cartons,
'sku_code', sku_code,
'unit', COALESCE(unit, 'กล่อง'),
```

### หลังแก้ไข:
```sql
SUM(CASE WHEN LOWER(product_name) LIKE '%ลัง%' THEN ... END) as total_cartons,
'sku_code', sku,
'unit', CASE WHEN LOWER(product_name) LIKE '%ลัง%' THEN 'ลัง' ... END,
```

## ตัวอย่างการจำแนกหน่วย

### สินค้าที่จะจัดเป็น "ลัง":
- "ผงซักฟอก ABC 1 ลัง"
- "Soap Carton Pack"
- "น้ำยาลัง 24 ขวด"

### สินค้าที่จะจัดเป็น "ชิ้น":
- "สบู่ก้อน 1 ชิ้น"
- "แปรงฟัน 1 piece"
- "ของเล่น 5 pcs"

### สินค้าอื่นๆ:
- จะถูกจัดเป็น "กล่อง" (default)

## การทดสอบ

หลังจากรัน SQL script ที่แก้ไขแล้ว:

```sql
-- ทดสอบการจำแนกหน่วย
SELECT
    product_name,
    CASE
        WHEN LOWER(product_name) LIKE '%ลัง%' OR LOWER(product_name) LIKE '%carton%' THEN 'ลัง'
        WHEN LOWER(product_name) LIKE '%ชิ้น%' OR LOWER(product_name) LIKE '%piece%' OR LOWER(product_name) LIKE '%pcs%' THEN 'ชิ้น'
        ELSE 'กล่อง'
    END as detected_unit
FROM inventory_items
LIMIT 10;
```

## หมายเหตุ

- วิธีนี้ใช้ชื่อสินค้าเป็นตัวกำหนดหน่วย ซึ่งอาจไม่แม่นยำ 100%
- ในอนาคตหากต้องการความแม่นยำมากขึ้น ควรเพิ่มคอลัมน์ `unit` จริงๆ ในตาราง
- สำหรับตอนนี้วิธีนี้จะช่วยให้ระบบทำงานได้โดยไม่ error