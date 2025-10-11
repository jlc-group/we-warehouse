-- ========================================
-- INSERT SAMPLE USERS FOR TESTING
-- ========================================
--
-- This script creates sample users for each department and role level
-- Run this AFTER creating the users table (CREATE_USERS_TABLE.sql)
--
-- Login credentials (for demo mode):
-- - Email: Any email below
-- - Password: Any password (demo mode accepts anything)
--
-- ========================================

-- 1. LEVEL 5: System Administrator (ผู้ดูแลระบบ)
INSERT INTO public.users (
  email, full_name, department, role, role_level,
  employee_code, phone, is_active
) VALUES (
  'admin@warehouse.com',
  'ผู้ดูแลระบบ (Admin)',
  'IT/ระบบ',
  'ผู้ดูแลระบบ',
  5,
  'ADM001',
  '081-111-1111',
  true
);

-- 2. LEVEL 4: Warehouse Manager (ผู้จัดการคลัง)
INSERT INTO public.users (
  email, full_name, department, role, role_level,
  employee_code, phone, is_active
) VALUES (
  'warehouse.manager@warehouse.com',
  'สมชาย ใจดี (Warehouse Manager)',
  'คลังสินค้า',
  'ผู้จัดการคลัง',
  4,
  'WH001',
  '081-222-2222',
  true
),
(
  'finance.manager@warehouse.com',
  'สมศักดิ์ มั่งคั่ง (Finance Manager)',
  'การเงิน',
  'ผู้จัดการคลัง',
  4,
  'FIN001',
  '081-333-3333',
  true
);

-- 3. LEVEL 3: Department Heads (หัวหน้าแผนก)
INSERT INTO public.users (
  email, full_name, department, role, role_level,
  employee_code, phone, is_active
) VALUES (
  'purchasing.head@warehouse.com',
  'สมหญิง รักดี (Purchasing Head)',
  'จัดซื้อ',
  'หัวหน้าแผนก',
  3,
  'PUR001',
  '081-444-4444',
  true
),
(
  'sales.head@warehouse.com',
  'สมปอง ขายดี (Sales Head)',
  'ขาย',
  'หัวหน้าแผนก',
  3,
  'SAL001',
  '081-555-5555',
  true
),
(
  'qc.head@warehouse.com',
  'สมใจ ละเอียด (QC Head)',
  'ควบคุมคุณภาพ',
  'หัวหน้าแผนก',
  3,
  'QC001',
  '081-666-6666',
  true
);

-- 4. LEVEL 2: Staff (เจ้าหน้าที่)
INSERT INTO public.users (
  email, full_name, department, role, role_level,
  employee_code, phone, is_active
) VALUES
-- Warehouse Staff
(
  'warehouse.staff1@warehouse.com',
  'พนักงาน คลังสินค้า 1',
  'คลังสินค้า',
  'เจ้าหน้าที่',
  2,
  'WH101',
  '082-111-1111',
  true
),
(
  'warehouse.staff2@warehouse.com',
  'พนักงาน คลังสินค้า 2',
  'คลังสินค้า',
  'เจ้าหน้าที่',
  2,
  'WH102',
  '082-111-2222',
  true
),
(
  'warehouse.staff3@warehouse.com',
  'พนักงาน คลังสินค้า 3',
  'คลังสินค้า',
  'เจ้าหน้าที่',
  2,
  'WH103',
  '082-111-3333',
  true
),
-- Purchasing Staff
(
  'purchasing.staff@warehouse.com',
  'พนักงาน จัดซื้อ',
  'จัดซื้อ',
  'เจ้าหน้าที่',
  2,
  'PUR101',
  '082-222-1111',
  true
),
-- Sales Staff
(
  'sales.staff@warehouse.com',
  'พนักงาน ขาย',
  'ขาย',
  'เจ้าหน้าที่',
  2,
  'SAL101',
  '082-333-1111',
  true
),
-- QC Staff
(
  'qc.staff@warehouse.com',
  'พนักงาน QC',
  'ควบคุมคุณภาพ',
  'เจ้าหน้าที่',
  2,
  'QC101',
  '082-444-1111',
  true
),
-- Finance Staff
(
  'finance.staff@warehouse.com',
  'พนักงาน การเงิน',
  'การเงิน',
  'เจ้าหน้าที่',
  2,
  'FIN101',
  '082-555-1111',
  true
);

-- 5. LEVEL 1: Viewers (ผู้อ่านอย่างเดียว)
INSERT INTO public.users (
  email, full_name, department, role, role_level,
  employee_code, phone, is_active
) VALUES (
  'viewer@warehouse.com',
  'ผู้ดูข้อมูล (Viewer)',
  'ทั่วไป',
  'ผู้อ่านอย่างเดียว',
  1,
  'VW001',
  '083-111-1111',
  true
),
(
  'executive@warehouse.com',
  'ผู้บริหาร (Executive)',
  'ผู้บริหาร',
  'ผู้อ่านอย่างเดียว',
  1,
  'EXE001',
  '083-999-9999',
  true
);

-- ========================================
-- VERIFICATION
-- ========================================

-- Check all created users
SELECT
  employee_code,
  full_name,
  department,
  role,
  role_level,
  email,
  is_active
FROM public.users
ORDER BY role_level DESC, department, employee_code;

-- Check users by department
SELECT
  department,
  COUNT(*) as user_count,
  STRING_AGG(role, ', ' ORDER BY role_level DESC) as roles
FROM public.users
WHERE is_active = true
GROUP BY department
ORDER BY user_count DESC;

-- Check users by role level
SELECT
  role_level,
  role,
  COUNT(*) as user_count
FROM public.users
WHERE is_active = true
GROUP BY role_level, role
ORDER BY role_level DESC;

-- ========================================
-- LOGIN CREDENTIALS FOR TESTING
-- ========================================
--
-- 🔐 Demo Mode Login (Any password works):
--
-- LEVEL 5 - System Admin:
--   Email: admin@warehouse.com
--   Access: Everything
--
-- LEVEL 4 - Managers:
--   Email: warehouse.manager@warehouse.com
--   Email: finance.manager@warehouse.com
--   Access: Full warehouse + finance + reports
--
-- LEVEL 3 - Department Heads:
--   Email: purchasing.head@warehouse.com
--   Email: sales.head@warehouse.com
--   Email: qc.head@warehouse.com
--   Access: Warehouse + sales + limited finance
--
-- LEVEL 2 - Staff:
--   Email: warehouse.staff1@warehouse.com
--   Email: purchasing.staff@warehouse.com
--   Email: sales.staff@warehouse.com
--   Email: qc.staff@warehouse.com
--   Email: finance.staff@warehouse.com
--   Access: Basic warehouse operations
--
-- LEVEL 1 - Viewers:
--   Email: viewer@warehouse.com
--   Email: executive@warehouse.com
--   Access: View only
--
-- Password: (anything works in demo mode)
--
-- ========================================
-- SUCCESS!
-- ========================================
-- ✅ Created 15 sample users across 7 departments
-- ✅ All role levels (1-5) represented
-- ✅ Ready for testing role-based access control
--
-- Next step: Login and test!
-- ========================================
