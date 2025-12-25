# แก้ไขปัญหาความสัมพันธ์ระหว่าง Inventory Items และ Conversion Rates

## ปัญหาที่พบ

มีความไม่สอดคล้องกันระหว่าง 2 ตาราง:

### 1. `inventory_items` (ก่อนแก้ไข)
```sql
- unit_level1_conversion_rate  ❌ ชื่อไม่ตรง
- unit_level2_conversion_rate  ❌ ชื่อไม่ตรง
```

### 2. `product_conversion_rates`
```sql
- unit_level1_rate  ✓ ชื่อมาตรฐาน
- unit_level2_rate  ✓ ชื่อมาตรฐาน
```

**ผลกระทบ:**
- สินค้าแต่ละ location มีอัตราแปลงหน่วยไม่ตรงกับที่กำหนดไว้ใน product_conversion_rates
- เกิดการคำนวณผิดพลาดเมื่อแปลงหน่วย
- ข้อมูลไม่ sync กัน

## วิธีแก้ไข

### Migration 1: `20251002_fix_unit_column_names.sql`
**จุดประสงค์:** เปลี่ยนชื่อ column ให้ตรงกัน

**การทำงาน:**
1. Rename `unit_level1_conversion_rate` → `unit_level1_rate`
2. Rename `unit_level2_conversion_rate` → `unit_level2_rate`
3. Update computed column `total_base_quantity`
4. Update constraints
5. Recreate indexes

**ผลลัพธ์:**
- ✅ Column naming ตรงกันทั้ง 2 ตาราง
- ✅ Computed column ทำงานถูกต้อง
- ✅ Constraints และ indexes อัปเดตแล้ว

### Migration 2: `20251002_sync_conversion_rates.sql`
**จุดประสงค์:** ซิงค์ข้อมูลและสร้าง auto-sync mechanism

**การทำงาน:**

1. **Function: `sync_inventory_conversion_rates()`**
   - ซิงค์อัตราแปลงหน่วยจาก `product_conversion_rates` → `inventory_items`
   - Match ด้วย SKU
   - Update เฉพาะที่ค่าไม่ตรงกัน

2. **Trigger: `trigger_auto_sync_conversion_rates`**
   - ทำงานอัตโนมัติเมื่อ `product_conversion_rates` มีการ INSERT/UPDATE
   - อัปเดต `inventory_items` ทั้งหมดที่มี SKU ตรงกัน
   - รับประกันว่าข้อมูลจะ sync กันเสมอ

**ผลลัพธ์:**
- ✅ Inventory items มีอัตราแปลงหน่วยถูกต้อง
- ✅ Auto-sync เมื่อแก้ไข product_conversion_rates
- ✅ ไม่ต้อง manual sync อีกต่อไป

## วิธีใช้งาน

### 1. Run Migrations (ตามลำดับ)

```bash
# ใน Supabase Dashboard หรือ psql
\i supabase/migrations/20251002_fix_unit_column_names.sql
\i supabase/migrations/20251002_sync_conversion_rates.sql
```

### 2. Verify การแก้ไข

```sql
-- ตรวจสอบว่า column ถูก rename แล้ว
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inventory_items'
  AND column_name LIKE 'unit_level%rate';
-- ควรได้: unit_level1_rate, unit_level2_rate

-- ตรวจสอบว่าข้อมูล sync แล้ว
SELECT
  inv.product_name,
  inv.sku,
  inv.unit_level1_rate AS inv_rate,
  pcr.unit_level1_rate AS pcr_rate,
  CASE
    WHEN inv.unit_level1_rate = pcr.unit_level1_rate THEN '✓ Match'
    ELSE '✗ Mismatch'
  END AS status
FROM inventory_items inv
LEFT JOIN product_conversion_rates pcr ON inv.sku = pcr.sku
WHERE pcr.sku IS NOT NULL
LIMIT 10;
```

### 3. Manual Sync (ถ้าจำเป็น)

```sql
-- รัน function เพื่อ sync ข้อมูลใหม่
SELECT sync_inventory_conversion_rates();
```

## โครงสร้างใหม่หลังแก้ไข

### inventory_items
```sql
CREATE TABLE inventory_items (
  ...
  -- Unit Level 1 (ลัง)
  unit_level1_name TEXT,
  unit_level1_quantity INTEGER,
  unit_level1_rate INTEGER,  ✅ ตรงกับ product_conversion_rates

  -- Unit Level 2 (กล่อง)
  unit_level2_name TEXT,
  unit_level2_quantity INTEGER,
  unit_level2_rate INTEGER,  ✅ ตรงกับ product_conversion_rates

  -- Unit Level 3 (ชิ้น - base unit)
  unit_level3_name TEXT,
  unit_level3_quantity INTEGER,

  -- Computed
  total_base_quantity INTEGER GENERATED ALWAYS AS (
    COALESCE(unit_level1_quantity * unit_level1_rate, 0) +
    COALESCE(unit_level2_quantity * unit_level2_rate, 0) +
    COALESCE(unit_level3_quantity, 0)
  ) STORED
);
```

### product_conversion_rates
```sql
CREATE TABLE product_conversion_rates (
  sku TEXT UNIQUE,
  product_name TEXT,
  unit_level1_name TEXT,
  unit_level1_rate INTEGER,  ✅ ตรงกับ inventory_items
  unit_level2_name TEXT,
  unit_level2_rate INTEGER,  ✅ ตรงกับ inventory_items
  unit_level3_name TEXT
);
```

## ข้อควรระวัง

1. **Backup ก่อน run migration**
   ```sql
   CREATE TABLE inventory_items_backup AS SELECT * FROM inventory_items;
   ```

2. **ตรวจสอบ computed column**
   - `total_base_quantity` จะถูกคำนวณใหม่อัตโนมัติ
   - ตรวจสอบว่าค่าถูกต้อง

3. **Testing**
   - ทดสอบการเพิ่มสินค้าใหม่
   - ทดสอบการแก้ไข conversion rates
   - ตรวจสอบว่า auto-sync ทำงาน

## สรุป

✅ **ก่อนแก้ไข:**
- Column names ไม่ตรงกัน (`conversion_rate` vs `rate`)
- ข้อมูลไม่ sync กัน
- ต้อง manual sync

✅ **หลังแก้ไข:**
- Column names เหมือนกัน (`unit_level1_rate`, `unit_level2_rate`)
- ข้อมูล sync อัตโนมัติผ่าน trigger
- ระบบทำงานถูกต้อง consistent
