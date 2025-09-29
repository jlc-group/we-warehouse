# Product Search Troubleshooting Guide

## ปัญหา: ค้นหาสินค้าไม่ครบ / สินค้าหายไป

### สาเหตุหลัก
ปัญหานี้เกิดขึ้นเพราะ **Database View ขาดหายไป** ทำให้ระบบต้องใช้โหมด fallback ที่ซับซ้อนและอาจไม่แสดงสินค้าครบถ้วน

### วิธีตรวจสอบปัญหา

1. **เข้าไปที่หน้า Sales** → แท็บ "ใบสั่งซื้อ"
2. **ดูที่ Product Search Debug Panel** (ด้านล่างของหน้า)
3. **ตรวจสอบสถานะ:**
   - 🟢 **View Mode** = ปกติ (ใช้ database view)
   - 🟡 **Fallback Mode** = มีปัญหา (database view หายไป)

### วิธีแก้ไข

#### วิธีที่ 1: Auto-Fix (ถ้าระบบรองรับ)
1. ไปที่ Product Search Debug Panel
2. คลิก **"Auto-Fix: Apply Migration"**
3. รอให้เสร็จและคลิก **Refresh**

#### วิธีที่ 2: Manual Fix (แนะนำ)
1. ไปที่ Product Search Debug Panel
2. คลิก **"Manual: Copy SQL"**
3. เปิด [Supabase Dashboard](https://supabase.com) → SQL Editor
4. Paste SQL และ Run
5. กลับมาที่แอปและคลิก **Refresh**

#### วิธีที่ 3: ใช้ไฟล์ Migration
1. เปิดไฟล์ `MANUAL_APPLY_PRODUCTS_SUMMARY.sql` ในโปรเจ็กต์
2. Copy SQL ทั้งหมด
3. เปิด Supabase Dashboard → SQL Editor
4. Paste และ Run

### ตรวจสอบว่าแก้ไขสำเร็จ

หลังจากแก้ไขแล้ว ให้ตรวจสอบ:

1. **Debug Panel แสดง "View Mode"** แทน "Fallback Mode"
2. **สามารถค้นหาสินค้าได้ครบถ้วน** ในหน้า Sales
3. **Console log แสดงข้อความ** "Fetched products summary from view"

### ป้องกันปัญหาในอนาคต

- **อย่าลบ database views** ใน Supabase
- **Backup views** ก่อนทำการแก้ไข database
- **ตรวจสอบ Debug Panel** เป็นประจำ

### SQL Migration ที่ต้อง Apply

```sql
-- สร้าง products_summary view
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

    -- คำนวณจำนวนรวมด้วย conversion rates ที่ถูกต้อง
    COALESCE(
        SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0
    ) as total_pieces,

    -- ข้อมูลการแปลงหน่วย
    COALESCE(pcr.unit_level1_name, 'ลัง') as unit_level1_name,
    COALESCE(pcr.unit_level2_name, 'กล่อง') as unit_level2_name,
    COALESCE(pcr.unit_level3_name, 'ชิ้น') as unit_level3_name,
    COALESCE(pcr.unit_level1_rate, 24) as unit_level1_rate,
    COALESCE(pcr.unit_level2_rate, 1) as unit_level2_rate,

    COUNT(DISTINCT inv.location) as location_count,

    -- สถานะสต็อก
    CASE
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 10 THEN 'low_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 50 THEN 'medium_stock'
        ELSE 'high_stock'
    END as stock_status,

    MAX(inv.updated_at) as last_updated,
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
ORDER BY p.product_type, p.product_name;

-- สร้าง available_products_for_sales view
CREATE OR REPLACE VIEW public.available_products_for_sales AS
SELECT * FROM public.products_summary
WHERE total_pieces > 0
ORDER BY product_type, stock_status DESC, product_name;
```

### หมายเหตุสำคัญ

- **Database View** ให้ประสิทธิภาพดีกว่า Fallback Mode มาก
- **Fallback Mode** ได้รับการปรับปรุงให้แสดงสินค้าทั้งหมดแล้ว (รวมสินค้าที่ไม่มีสต็อก)
- **Debug Panel** ให้ข้อมูลครบถ้วนสำหรับการแก้ไขปัญหา

### การติดต่อสำหรับความช่วยเหลือ

หากยังมีปัญหา:
1. ตรวจสอบ Console Log ใน Browser Developer Tools
2. Screenshot Debug Panel เพื่อให้ข้อมูลเพิ่มเติม
3. ตรวจสอบว่าฐานข้อมูลมีตาราง `products`, `inventory_items`, และ `product_conversion_rates`