-- ทดสอบขั้นตอนที่ 1: เช็คว่าตาราง customers มี column อะไรบ้าง
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'customers'
ORDER BY ordinal_position;
