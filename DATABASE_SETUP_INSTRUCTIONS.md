# วิธีการสร้าง Database Views ใน Supabase

## สำหรับแก้ปัญหา 404 Error: available_products_for_sales

ระบบจะแสดง error 404 เมื่อพยายามเข้าถึง view `available_products_for_sales` เพราะ view ยังไม่ได้ถูกสร้างในฐานข้อมูล

## ขั้นตอนการแก้ไข:

### 1. เข้าสู่ Supabase Dashboard
- ไปที่ [Supabase Dashboard](https://supabase.com/dashboard)
- เลือกโปรเจคของคุณ
- คลิกที่ "SQL Editor" ในเมนูซ้าย

### 2. รัน Migration Script
คัดลอกโค้ดจากไฟล์ `supabase/migrations/20250927_create_products_summary_view.sql` และรันใน SQL Editor:

```sql
-- สร้าง view สำหรับสรุปสินค้า (รวมจากทุก location)
-- เซลจะเห็นแค่สินค้า + จำนวนรวม, ไม่เห็น location

-- ลบ view เก่าถ้ามี
DROP VIEW IF EXISTS public.products_summary;

-- สร้าง view ใหม่
CREATE OR REPLACE VIEW public.products_summary AS
SELECT
    p.id as product_id,
    p.sku_code as sku,
    p.product_name,
    p.category,
    p.subcategory,
    p.brand,
    p.product_type,
    p.unit_of_measure,
    p.unit_cost,
    p.description,

    -- รวมจำนวนสต็อกจากทุก location
    COALESCE(SUM(inv.unit_level1_quantity), 0) as total_level1_quantity,
    COALESCE(SUM(inv.unit_level2_quantity), 0) as total_level2_quantity,
    COALESCE(SUM(inv.unit_level3_quantity), 0) as total_level3_quantity,

    -- คำนวณจำนวนรวมทั้งหมด (เป็น pieces)
    COALESCE(
        SUM(
            (inv.unit_level1_quantity * COALESCE(inv.unit_level1_rate, 1) * COALESCE(inv.unit_level2_rate, 1)) +
            (inv.unit_level2_quantity * COALESCE(inv.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0
    ) as total_pieces,

    -- ข้อมูลการแปลงหน่วยจาก conversion rates
    pcr.unit_level1_name,
    pcr.unit_level2_name,
    pcr.unit_level3_name,
    pcr.unit_level1_rate,
    pcr.unit_level2_rate,

    -- จำนวน location ที่มีสินค้านี้
    COUNT(DISTINCT inv.location) as location_count,

    -- location ที่มีสต็อกมากที่สุด (สำหรับข้อมูล)
    (
        SELECT location
        FROM inventory_items inv2
        WHERE inv2.sku = p.sku_code
        ORDER BY (
            (inv2.unit_level1_quantity * COALESCE(inv2.unit_level1_rate, 1) * COALESCE(inv2.unit_level2_rate, 1)) +
            (inv2.unit_level2_quantity * COALESCE(inv2.unit_level2_rate, 1)) +
            inv2.unit_level3_quantity
        ) DESC
        LIMIT 1
    ) as primary_location,

    -- สถานะสต็อก
    CASE
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(inv.unit_level1_rate, 1) * COALESCE(inv.unit_level2_rate, 1)) +
            (inv.unit_level2_quantity * COALESCE(inv.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(inv.unit_level1_rate, 1) * COALESCE(inv.unit_level2_rate, 1)) +
            (inv.unit_level2_quantity * COALESCE(inv.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 10 THEN 'low_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(inv.unit_level1_rate, 1) * COALESCE(inv.unit_level2_rate, 1)) +
            (inv.unit_level2_quantity * COALESCE(inv.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 50 THEN 'medium_stock'
        ELSE 'high_stock'
    END as stock_status,

    -- เวลาอัปเดตล่าสุด
    MAX(inv.updated_at) as last_updated,

    -- สถานะสินค้า
    p.is_active

FROM public.products p
LEFT JOIN public.inventory_items inv ON p.sku_code = inv.sku
LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku
WHERE p.is_active = true
GROUP BY
    p.id, p.sku_code, p.product_name, p.category, p.subcategory,
    p.brand, p.product_type, p.unit_of_measure, p.unit_cost,
    p.description, p.is_active,
    pcr.unit_level1_name, pcr.unit_level2_name, pcr.unit_level3_name,
    pcr.unit_level1_rate, pcr.unit_level2_rate
ORDER BY p.product_name;

-- เพิ่ม comment
COMMENT ON VIEW public.products_summary IS 'สรุปสินค้าสำหรับ Sales - รวมสต็อกจากทุก location, ไม่แสดง location ให้เซลเห็น';

-- สร้าง view เพิ่มเติมสำหรับการใช้งานง่าย
CREATE OR REPLACE VIEW public.available_products_for_sales AS
SELECT
    *
FROM public.products_summary
WHERE total_pieces > 0  -- มีสต็อก
ORDER BY stock_status DESC, product_name;

COMMENT ON VIEW public.available_products_for_sales IS 'สินค้าที่มีสต็อกสำหรับการขาย - ใช้ในหน้า Sales';

SELECT 'สร้าง products_summary view สำเร็จแล้ว! เซลจะเห็นสต็อกรวมทั้งระบบแทนที่จะเป็นแยก location' as status;
```

### 3. ตรวจสอบการสร้าง Views
หลังจากรันคำสั่งแล้ว ควรจะเห็นข้อความ:
```
สร้าง products_summary view สำเร็จแล้ว! เซลจะเห็นสต็อกรวมทั้งระบบแทนที่จะเป็นแยก location
```

### 4. ทดสอบ Views
รันคำสั่งเพื่อทดสอบว่า views ทำงาน:

```sql
-- ทดสอบ products_summary
SELECT COUNT(*) as total_products FROM public.products_summary;

-- ทดสอบ available_products_for_sales
SELECT COUNT(*) as available_products FROM public.available_products_for_sales;
```

## การทำงานของระบบ Fallback

หากยังไม่ได้รัน migration หรือ views ไม่พร้อมใช้งาน ระบบจะ:

1. **แสดงข้อความแจ้งเตือน**: การ์ดสีส้มแจ้งว่า "กำลังใช้ข้อมูลสำรอง"
2. **ใช้ข้อมูล Fallback**: ดึงข้อมูลจาก inventory_items แบบเดิมและรวมเป็น ProductSummary
3. **ทำงานได้ปกติ**: ระบบยังคงใช้งานได้แม้ว่า views ไม่พร้อม

## หมายเหตุ

- **การรวมข้อมูล**: Views เหล่านี้จะรวมสต็อกจากทุก location เพื่อให้เซลเห็นจำนวนรวมทั้งระบบ
- **ประสิทธิภาพ**: การใช้ views จะเร็วกว่าการใช้ fallback mechanism
- **ความปลอดภัย**: Fallback mechanism ทำให้ระบบยังใช้งานได้แม้ว่า database จะมีปัญหา