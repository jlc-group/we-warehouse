-- ทดสอบขั้นตอนที่ 3: เช็คว่าตาราง sales_bills มี column อะไรบ้าง
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'sales_bills'
ORDER BY ordinal_position;
