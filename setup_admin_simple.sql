-- ==========================================
-- Script สำหรับอัพเกรด user เป็น Admin
-- รันหลังจากสร้างตาราง users แล้ว
-- ==========================================

-- ตรวจสอบว่ามี admin user หรือยัง
SELECT
    email,
    full_name,
    role,
    role_level
FROM public.users
WHERE email = 'admin@warehouse.local';

-- อัพเดท user เป็น Super Admin (ถ้าต้องการเปลี่ยน)
UPDATE public.users
SET
    role = 'ผู้ดูแลระบบ',
    role_level = 5,
    department = 'ผู้บริหาร',
    employee_code = 'ADMIN001',
    is_active = true,
    full_name = 'System Administrator'
WHERE email = 'admin@warehouse.local';

-- เพิ่ม admin user ใหม่ (ถ้ายังไม่มี)
INSERT INTO public.users (
    email,
    password_hash,
    full_name,
    department,
    role,
    role_level,
    employee_code,
    is_active
)
SELECT
    'admin@warehouse.local',
    hash_password('Admin123!'),
    'System Administrator',
    'ผู้บริหาร',
    'ผู้ดูแลระบบ',
    5,
    'ADMIN001',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'admin@warehouse.local'
);

-- ตรวจสอบผลลัพธ์
SELECT
    email,
    full_name,
    department,
    role,
    role_level,
    employee_code,
    is_active
FROM public.users
WHERE email = 'admin@warehouse.local';