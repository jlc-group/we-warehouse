# 🚀 Supabase Database Setup Instructions

## ขั้นตอนการแก้ไขปัญหาการแสดงข้อมูล Location

### ปัญหาที่พบ
- ข้อมูล inventory ที่มี location format แบบ `A1/1`, `A1/01`, `A1-1` ไม่แสดงในหน้า Location Management
- เกิดจากการที่ระบบต้องการ format มาตรฐาน `A/1/01` แต่ข้อมูลจริงมีหลายรูปแบบ

### วิธีแก้ไข

#### ขั้นตอนที่ 1: รัน Database Setup Script
1. เปิด **Supabase Dashboard** → **SQL Editor**
2. คัดลอกเนื้อหาทั้งหมดจากไฟล์ `complete_database_setup.sql`
3. วางในช่อง SQL Editor
4. กดปุ่ม **RUN** เพื่อรันคำสั่ง

**ผลลัพธ์ที่คาดหวัง:**
```
Database setup completed! You can now run the sync function.
```

#### ขั้นตอนที่ 2: ทดสอบ Normalization Function
หลังจากรัน setup script แล้ว ให้ทดสอบ function ด้วยคำสั่งนี้:

```sql
-- ทดสอบการแปลง location formats
SELECT
    input,
    normalize_location_format(input) as normalized
FROM (VALUES
    ('A1/1'),    -- ควรได้ A/1/01
    ('A1-1'),    -- ควรได้ A/1/01
    ('A1.1'),    -- ควรได้ A/1/01
    ('A101'),    -- ควรได้ A/1/01
    ('A/1/01')   -- ควรได้ A/1/01 (ไม่เปลี่ยน)
) as t(input);
```

#### ขั้นตอนที่ 3: รัน Sync Function
เพื่อดึงข้อมูล inventory locations ทั้งหมดและสร้าง warehouse_locations:

```sql
SELECT sync_inventory_to_warehouse_locations();
```

**ผลลัพธ์ที่คาดหวัง:**
```
Sync completed! New: 15, Updated: 8, Errors: 0
```

#### ขั้นตอนที่ 4: ตรวจสอบข้อมูล
ตรวจสอบว่าข้อมูลถูกสร้างถูกต้อง:

```sql
-- ดูข้อมูล locations ที่มี inventory
SELECT * FROM warehouse_locations_with_inventory
WHERE inventory_count > 0
LIMIT 10;

-- ดูสถิติรวม
SELECT * FROM get_location_statistics();
```

### ขั้นตอนการทดสอบในแอปพลิเคชัน

1. **รีเฟรชหน้าเว็บ** เพื่อให้ข้อมูลใหม่โหลดขึ้นมา
2. ไปที่แท็บ **"ตำแหน่ง"** ในหน้าหลัก
3. ตรวจสอบว่าตอนนี้เห็นข้อมูล locations ที่มี inventory แล้ว
4. กดปุ่ม **"ซิงค์ข้อมูล"** เพื่อให้แน่ใจว่าข้อมูลครบถ้วน

### สิ่งที่จะเปลี่ยนแปลง

**ก่อนแก้ไข:**
- Location `A1/1` ใน inventory_items ไม่แสดงในหน้า Location Management
- การกดปุ่ม "ซิงค์" ให้ error 453
- ไม่แสดงรายละเอียดสินค้าในแต่ละตำแหน่ง

**หลังแก้ไข:**
- Location `A1/1` จะถูกแปลงเป็น `A/1/01` และแสดงในหน้า Location Management
- ข้อมูล inventory จะแสดงถูกต้อง: จำนวนลัง, กล่อง, ชิ้น, หลวม, จำนวนรวม
- แสดงรหัสสินค้า, ชื่อสินค้า, และหน่วยนับในแต่ละตำแหน่ง
- แสดงรายการสินค้าทั้งหมดในตำแหน่งนั้น ๆ
- การซิงค์จะทำงานไม่มี error
- % การใช้งานคำนวณได้ถูกต้อง

### Format ที่รองรับ

Function `normalize_location_format` รองรับ format เหล่านี้:

| Input Format | Output Format | ตอวจาํง |
|-------------|---------------|---------|
| `A1/1`      | `A/1/01`     | ✅ |
| `A1/01`     | `A/1/01`     | ✅ |
| `A1-1`      | `A/1/01`     | ✅ |
| `A1.1`      | `A/1/01`     | ✅ |
| `A101`      | `A/1/01`     | ✅ |
| `A11`       | `A/1/01`     | ✅ |
| `A/1/01`    | `A/1/01`     | ✅ (ไม่เปลี่ยน) |

### การแก้ไขปัญหาเพิ่มเติม

หากยังมีปัญหา ให้ตรวจสอบ:

1. **RPC Functions ถูกสร้างหรือไม่:**
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%warehouse%';
```

2. **View ถูกสร้างหรือไม่:**
```sql
SELECT viewname FROM pg_views WHERE viewname = 'warehouse_locations_with_inventory';
```

3. **Permissions ถูกต้องหรือไม่:**
```sql
SELECT * FROM information_schema.table_privileges
WHERE table_name = 'warehouse_locations_with_inventory';
```

### หมายเหตุ

- การรัน script นี้จะไม่ลบข้อมูลเดิม จะเพิ่มเติมและปรับปรุงเท่านั้น
- หาก location มีอยู่แล้ว จะอัปเดต description เท่านั้น
- หาก location ใหม่ จะสร้างพร้อม capacity ที่เหมาะสม