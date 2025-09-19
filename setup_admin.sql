-- ==========================================
-- Setup Admin User Script
-- Run this after registering admin@warehouse.local
-- ==========================================

-- This script will upgrade the user to Super Admin status
-- Replace 'admin@warehouse.local' with the actual email you registered

UPDATE public.profiles
SET
    role_id = (SELECT id FROM public.roles WHERE name = 'super_admin'),
    department_id = (SELECT id FROM public.departments WHERE name = 'management'),
    employee_code = 'ADMIN001',
    is_active = true,
    full_name = 'System Administrator'
WHERE email = 'admin@warehouse.local';

-- Verify the setup
SELECT
    p.email,
    p.full_name,
    p.employee_code,
    d.name_thai as department,
    r.name_thai as role,
    r.level as role_level
FROM public.profiles p
LEFT JOIN public.departments d ON p.department_id = d.id
LEFT JOIN public.roles r ON p.role_id = r.id
WHERE p.email = 'admin@warehouse.local';

-- Show all available departments and roles for reference
SELECT 'Available Departments:' as info;
SELECT name, name_thai, color FROM public.departments ORDER BY name;

SELECT 'Available Roles:' as info;
SELECT name, name_thai, level, permissions FROM public.roles ORDER BY level DESC;