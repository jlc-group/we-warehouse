-- Insert Customer Data and Warehouse Data Migration
-- เพิ่มข้อมูลลูกค้าทั้งหมด 25 รายการ และ warehouse A, B, C, D
-- This migration can be run multiple times safely (idempotent)

-- 1. Insert warehouse data first
INSERT INTO public.warehouses (code, name, description, is_active, location_prefix_start, location_prefix_end, max_levels, max_positions, created_at, updated_at)
VALUES
  ('A', 'Warehouse A', 'คลังสินค้า A', true, 'A', 'A', 10, 50, NOW(), NOW()),
  ('B', 'Warehouse B', 'คลังสินค้า B', true, 'B', 'B', 10, 50, NOW(), NOW()),
  ('C', 'Warehouse C', 'คลังสินค้า C', true, 'C', 'C', 10, 50, NOW(), NOW()),
  ('D', 'Warehouse D', 'คลังสินค้า D (หลัก)', true, 'D', 'D', 10, 50, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 2. Insert customer data with ON CONFLICT to handle duplicates
INSERT INTO public.customers (customer_code, customer_name, is_active, created_at, updated_at)
VALUES
  ('MT2563', 'บริษัท แมสมาร์เกตติ้ง จำกัด (สาขาที่ 0002)', true, NOW(), NOW()),
  ('MT2523', 'บริษัท ทเวนตี้โฟร์ ช้อปปิ้ง จำกัด (สำนักงานใหญ่)', true, NOW(), NOW()),
  ('L1-MT2580', 'บจก.ริช อินเตอร์เทรด อิมปอร์ต เอ็กซ์ปอร์ต (สำนักงานใหญ่)', true, NOW(), NOW()),
  ('MT2589', 'บริษัท ซีพี ออลล์ จำกัด (มหาชน) สำนักงานใหญ่', true, NOW(), NOW()),
  ('MT1199', 'บริษัท เซ็นทรัล วัตสัน จำกัด สำนักงานใหญ่', true, NOW(), NOW()),
  ('V1-MT2592', 'บริษัท บีเอ็มจี อินเตอร์ จำกัด', true, NOW(), NOW()),
  ('RB1531', 'TIKTOK (เงินสด)', true, NOW(), NOW()),
  ('MT1363', 'บริษัท ซี.เจ. เอ็กซ์เพรส กรุ๊ป จำกัด', true, NOW(), NOW()),
  ('RB1529', 'บริษัท ช้อปปี้ (ประเทศไทย) จำกัด (สำนักงานใหญ่)', true, NOW(), NOW()),
  ('MT2591', 'บริษัท คอนวี่ อินเตอร์เนชั่นแนล จำกัด (สำนักงานใหญ่)', true, NOW(), NOW()),
  ('MT2565', 'บริษัท สหลอว์สัน จำกัด (สำนักงานใหญ่)', true, NOW(), NOW()),
  ('MT2578', 'บริษัท เบทเตอร์เวย์ (ประเทศไทย) จำกัด (สำนักงานใหญ่)', true, NOW(), NOW()),
  ('MT2577', 'บริษัท อีฟ แอนด์ บอย จำกัด(สำนักงานใหญ่)', true, NOW(), NOW()),
  ('1536', 'Hnin wai', true, NOW(), NOW()),
  ('JG00002', 'บริษัท ลาซาด้า จำกัด(สำนักงานใหญ่)', true, NOW(), NOW()),
  ('C1-MT2581', 'บจก.ริช อินเตอร์เทรด อิมปอร์ต เอ็กซ์ปอร์ต (สำนักงานใหญ่)', true, NOW(), NOW()),
  ('RB1532_TIKTOK', 'บริษัท ติ๊กต๊อก ช้อป(ประเทศไทย) จำกัด', true, NOW(), NOW()),
  ('1458', 'Daw San San Win', true, NOW(), NOW()),
  ('JB1267', 'คุณรัตติกาล ชนะสิทธิ์', true, NOW(), NOW()),
  ('RB1538', 'Shopee Choice (เงินสด)', true, NOW(), NOW()),
  ('RB1524', 'ลูกค้าเงินสด', true, NOW(), NOW()),
  ('JN1079', 'Ksenia Kruchinina', true, NOW(), NOW()),
  ('RB1530', 'INBOX (เงินสด)', true, NOW(), NOW()),
  ('RB1537', 'Event (เงินสด)', true, NOW(), NOW()),
  ('RB1532_LNWSHOP', 'lnwshop (เงินสด)', true, NOW(), NOW())
ON CONFLICT (customer_code) DO NOTHING;

-- Verify insertion
SELECT
  customer_code,
  customer_name,
  created_at
FROM public.customers
WHERE customer_code IN (
  'MT2563', 'MT2523', 'L1-MT2580', 'MT2589', 'MT1199', 'V1-MT2592', 'RB1531',
  'MT1363', 'RB1529', 'MT2591', 'MT2565', 'MT2578', 'MT2577', '1536', 'JG00002',
  'C1-MT2581', 'RB1532_TIKTOK', '1458', 'JB1267', 'RB1538', 'RB1524', 'JN1079',
  'RB1530', 'RB1537', 'RB1532_LNWSHOP'
)
ORDER BY customer_code;

-- Summary
SELECT
  COUNT(*) as total_customers,
  COUNT(CASE WHEN customer_code LIKE 'MT%' THEN 1 END) as mt_customers,
  COUNT(CASE WHEN customer_code LIKE 'RB%' THEN 1 END) as rb_customers,
  COUNT(CASE WHEN customer_code LIKE '%-%' THEN 1 END) as code_with_dash,
  COUNT(CASE WHEN customer_code ~ '^[0-9]+$' THEN 1 END) as numeric_codes
FROM public.customers
WHERE customer_code IN (
  'MT2563', 'MT2523', 'L1-MT2580', 'MT2589', 'MT1199', 'V1-MT2592', 'RB1531',
  'MT1363', 'RB1529', 'MT2591', 'MT2565', 'MT2578', 'MT2577', '1536', 'JG00002',
  'C1-MT2581', 'RB1532_TIKTOK', '1458', 'JB1267', 'RB1538', 'RB1524', 'JN1079',
  'RB1530', 'RB1537', 'RB1532_LNWSHOP'
);

-- 3. Safely update existing inventory items to reference Warehouse D
-- สำหรับ location ปัจจุบันให้อ้างอิงกับ warehouse D
DO $$
DECLARE
  warehouse_d_id UUID;
BEGIN
  -- Get Warehouse D ID
  SELECT id INTO warehouse_d_id FROM public.warehouses WHERE code = 'D' LIMIT 1;

  -- Update inventory_items if table and column exist
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
             AND table_name = 'inventory_items'
             AND column_name = 'warehouse_id')
  AND warehouse_d_id IS NOT NULL THEN

    UPDATE public.inventory_items
    SET warehouse_id = warehouse_d_id
    WHERE warehouse_id IS NULL;

    RAISE NOTICE 'Updated % inventory_items to reference Warehouse D', ROW_COUNT;
  ELSE
    RAISE NOTICE 'Skipped inventory_items update - table or column not found, or Warehouse D not found';
  END IF;
END $$;

-- 4. Safely update existing warehouse locations to reference Warehouse D
-- ถ้ามี warehouse_locations table
DO $$
DECLARE
  warehouse_d_id UUID;
BEGIN
  -- Get Warehouse D ID
  SELECT id INTO warehouse_d_id FROM public.warehouses WHERE code = 'D' LIMIT 1;

  -- Update warehouse_locations if table and column exist
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
             AND table_name = 'warehouse_locations'
             AND column_name = 'warehouse_id')
  AND warehouse_d_id IS NOT NULL THEN

    UPDATE public.warehouse_locations
    SET warehouse_id = warehouse_d_id
    WHERE warehouse_id IS NULL;

    RAISE NOTICE 'Updated % warehouse_locations to reference Warehouse D', ROW_COUNT;
  ELSE
    RAISE NOTICE 'Skipped warehouse_locations update - table or column not found, or Warehouse D not found';
  END IF;
END $$;

-- 5. Verify warehouse data
SELECT
  code,
  name,
  description,
  is_active,
  location_prefix_start,
  location_prefix_end,
  max_levels,
  max_positions,
  created_at
FROM public.warehouses
ORDER BY code;