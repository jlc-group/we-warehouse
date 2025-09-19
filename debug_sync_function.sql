-- Debug sync function - ตรวจสอบว่า function มีอยู่จริงหรือไม่

-- 1. ตรวจสอบว่า function มีอยู่หรือไม่
SELECT
    proname as function_name,
    pg_get_function_result(oid) as return_type,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'sync_inventory_to_warehouse_locations';

-- 2. ทดสอบเรียกใช้ function โดยตรง
SELECT sync_inventory_to_warehouse_locations();

-- 3. ดูตัวอย่างข้อมูลใน inventory_items ที่จะถูก sync
SELECT DISTINCT location, COUNT(*) as item_count
FROM inventory_items
WHERE location IS NOT NULL AND location != ''
  AND location ~ '^[A-Z]/[1-4]/\d{2}$'
GROUP BY location
ORDER BY location
LIMIT 10;

-- 4. ดูข้อมูลใน warehouse_locations ปัจจุบัน
SELECT COUNT(*) as total_locations FROM warehouse_locations;

-- 5. ตรวจสอบ schema ของ warehouse_locations
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'warehouse_locations'
  AND table_schema = 'public'
ORDER BY ordinal_position;