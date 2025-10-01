-- ทดสอบขั้นตอนที่ 2: หา views ที่อ้างอิงตาราง customers
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND definition LIKE '%customers%'
AND definition LIKE '%customer_id%';
