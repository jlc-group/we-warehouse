-- ตรวจสอบโครงสร้างตาราง warehouse_locations
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'warehouse_locations'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ดูข้อมูลตัวอย่าง 5 แถวแรก
SELECT * FROM warehouse_locations LIMIT 5;