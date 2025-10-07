-- ============================================
-- 🚀 RESTORE 6 WAREHOUSES
-- ============================================
-- รันใน Supabase SQL Editor
-- https://supabase.com/dashboard/project/ogrcpzzmmudztwjfwjvu/sql/new
-- ============================================

-- INSERT warehouses ทั้งหมด
INSERT INTO public.warehouses (id, code, name, description, is_active, created_at, updated_at)
VALUES
  ('0d9778be-7b52-47c1-bd96-ab47fd3a8a55'::uuid, 'WHOOT', 'คลังสินค้าหลัก', 'คลังสินค้าหลัก (MAIN)', true, NOW(), NOW()),
  ('3f40f4fb-5826-47fc-89c7-bfe80a35ce83'::uuid, 'B', 'Warehouse B', 'คลังสินค้า B - รอง', true, NOW(), NOW()),
  ('4750662c-a72e-4eb0-a856-7710f8c2a319'::uuid, 'D', 'Warehouse D', 'คลังสินค้า D - สำรอง', true, NOW(), NOW()),
  ('939066ab-5113-4cae-8253-08420d1f9cf6'::uuid, 'C-ecom', 'Ecom', 'คลัง E-commerce', true, NOW(), NOW()),
  ('bd3a3e11-795b-41f4-a3a7-0a360130b132'::uuid, 'A', 'Warehouse A', 'คลังสินค้า A - หลัก', true, NOW(), NOW()),
  ('c6f43c5a-3949-46fd-9165-a3cd6e0b7509'::uuid, 'LLK-D', 'คลัง LLK - D', 'คลังสินค้า LLK แผนก D', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- แสดงผลลัพธ์
SELECT code, name, is_active FROM public.warehouses ORDER BY code;
