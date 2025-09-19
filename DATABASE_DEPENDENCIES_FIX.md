# 🔗 Database Dependencies Fix

## ⚠️ ปัญหา Dependencies Error

### Error ที่พบ:
```
ERROR: 2BP01: cannot drop function normalize_location_format(text) because other objects depend on it
DETAIL: view warehouse_locations_with_inventory depends on function normalize_location_format(text)
HINT: Use DROP ... CASCADE to drop the dependent objects too.
```

## 🔍 การวิเคราะห์ Dependencies

### Dependency Chain:
```
normalize_location_format(TEXT)
    ↑ ใช้โดย
warehouse_locations_with_inventory (VIEW)
    ↑ ใช้โดย
get_warehouse_locations_optimized() (FUNCTION)
get_locations_by_row() (FUNCTION)
sync_inventory_to_warehouse_locations() (FUNCTION)
```

### ปัญหาเดิม:
- พยายาม DROP `normalize_location_format` ก่อน `warehouse_locations_with_inventory`
- PostgreSQL ไม่อนุญาตให้ลบ object ที่มี dependencies

## ✅ วิธีแก้ไขถูกต้อง

### 1. **ลำดับการ DROP ที่ถูกต้อง**
```sql
-- ลบ view ก่อน (dependent object)
DROP VIEW IF EXISTS warehouse_locations_with_inventory CASCADE;

-- ลบ RPC functions (อาจใช้ normalize_location_format)
DROP FUNCTION IF EXISTS get_warehouse_locations_optimized(...) CASCADE;
DROP FUNCTION IF EXISTS get_location_statistics() CASCADE;
DROP FUNCTION IF EXISTS get_locations_by_row(...) CASCADE;
DROP FUNCTION IF EXISTS get_location_inventory_details(...) CASCADE;

-- ลบ sync function
DROP FUNCTION IF EXISTS sync_inventory_to_warehouse_locations() CASCADE;

-- ลบ normalize function สุดท้าย (base dependency)
DROP FUNCTION IF EXISTS normalize_location_format(TEXT) CASCADE;
```

### 2. **ใช้ CASCADE Flag**
- `CASCADE` จะลบ dependent objects โดยอัตโนมัติ
- ป้องกัน dependency errors
- ปลอดภัยกับ `IF EXISTS`

## 📋 Dependency Hierarchy

### Level 1 (Base):
- `normalize_location_format(TEXT)`

### Level 2 (ใช้ Level 1):
- `warehouse_locations_with_inventory` view
- `sync_inventory_to_warehouse_locations()` function

### Level 3 (ใช้ Level 2):
- `get_warehouse_locations_optimized()` function
- `get_locations_by_row()` function
- `get_location_inventory_details()` function

### ❌ ลำดับผิด (จะ error):
```sql
DROP FUNCTION normalize_location_format(TEXT);  -- ERROR!
DROP VIEW warehouse_locations_with_inventory;   -- เกิดหลัง
```

### ✅ ลำดับถูก (จะสำเร็จ):
```sql
DROP VIEW warehouse_locations_with_inventory CASCADE;   -- ลบก่อน
DROP FUNCTION normalize_location_format(TEXT) CASCADE;  -- ลบหลัง
```

## 🔍 การตรวจสอบ Dependencies

### ดู dependencies ของ function:
```sql
SELECT
    pg_describe_object(classid, objid, objsubid) as dependent_object,
    deptype
FROM pg_depend
WHERE refobjid = 'normalize_location_format(text)'::regprocedure;
```

### ดู objects ที่ function ใช้:
```sql
SELECT
    pg_describe_object(refclassid, refobjid, refobjsubid) as referenced_object
FROM pg_depend
WHERE objid = 'normalize_location_format(text)'::regprocedure;
```

## 🚀 ผลลัพธ์หลังแก้ไข

### ก่อนแก้ไข:
```
ERROR: cannot drop function normalize_location_format(text) because other objects depend on it
```

### หลังแก้ไข:
```sql
-- ทุก DROP statements ทำงานสำเร็จ
NOTICE: drop cascades to view warehouse_locations_with_inventory
DROP FUNCTION
DROP FUNCTION
...
Database setup completed!
```

## 💡 Best Practices สำหรับ Database Management

### 1. **การ DROP แบบปลอดภัย**:
```sql
-- ใช้ CASCADE เสมอกับ cleanup scripts
DROP VIEW IF EXISTS view_name CASCADE;
DROP FUNCTION IF EXISTS function_name(...) CASCADE;
```

### 2. **ลำดับการ DROP**:
1. Views / Materialized Views
2. Dependent Functions
3. Base Functions
4. Tables (ถ้าจำเป็น)

### 3. **การสร้างใหม่**:
1. Base Functions ก่อน
2. Dependent Functions
3. Views สุดท้าย

## 📁 ไฟล์ที่อัปเดต

- **`complete_database_setup.sql`** - แก้ไขลำดับ DROP และเพิ่ม CASCADE flags

## ✅ การตรวจสอบ

หลังจากรัน script ควรเห็น:
```
DROP VIEW
DROP FUNCTION
DROP FUNCTION
...
CREATE OR REPLACE FUNCTION normalize_location_format...
CREATE OR REPLACE FUNCTION sync_inventory_to_warehouse_locations...
CREATE VIEW warehouse_locations_with_inventory...
...
Database setup completed! You can now run the sync function.
```

## 🔄 การป้องกันปัญหาในอนาคต

1. **ทำ backup** ก่อน DROP CASCADE
2. **ใช้ transaction** เพื่อ rollback ได้
3. **เตรียม restoration script** ถ้าจำเป็น

```sql
BEGIN;
-- DROP statements here
-- CREATE statements here
COMMIT; -- หรือ ROLLBACK; ถ้ามีปัญหา
```