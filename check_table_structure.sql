-- ตรวจสอบโครงสร้างตาราง inventory_items ปัจจุบัน
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'inventory_items'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ตรวจสอบข้อมูลตัวอย่าง 5 รายการแรก
SELECT *
FROM public.inventory_items
LIMIT 5;

-- ตรวจสอบ constraints ที่มีอยู่
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'inventory_items'
  AND table_schema = 'public';