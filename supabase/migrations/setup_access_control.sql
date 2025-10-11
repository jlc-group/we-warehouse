-- Access Control System Setup Migration
-- ระบบการควบคุมการเข้าถึงสำหรับแต่ละแผนกและบทบาท
-- This migration can be run multiple times safely (idempotent)

-- 1. Insert Department Data
INSERT INTO public.departments (name, name_thai, description, color, is_active, created_at, updated_at)
VALUES
  ('admin', 'ผู้ดูแลระบบ', 'ผู้ดูแลระบบใหญ่ - เข้าถึงได้ทุกอย่าง', '#dc2626', true, NOW(), NOW()),
  ('warehouse_fg', 'แผนกคลัง FG', 'แผนกคลังที่ดูแลสินค้าสำเร็จรูป (Finished Goods)', '#2563eb', true, NOW(), NOW()),
  ('warehouse_pk', 'แผนกคลัง PK', 'แผนกคลังที่ดูแลวัสดุบรรจุภัณฑ์ (Packaging)', '#16a34a', true, NOW(), NOW()),
  ('sales', 'แผนกขาย', 'แผนกขายและการตลาด', '#ea580c', true, NOW(), NOW()),
  ('accounting', 'แผนกบัญชี', 'แผนกบัญชีและการเงิน', '#7c3aed', true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  name_thai = EXCLUDED.name_thai,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  updated_at = NOW();

-- 2. Insert Role Data with Permissions
INSERT INTO public.roles (name, name_thai, description, permissions, level, is_active, created_at, updated_at)
VALUES
  -- Super Admin Role
  ('super_admin', 'ผู้ดูแลระบบสูงสุด', 'เข้าถึงได้ทุกฟังก์ชัน รวมถึงการจัดการผู้ใช้',
   ARRAY[
     'admin.full_access',
     'inventory.fg.full_access', 'inventory.pk.full_access',
     'warehouse.all.full_access',
     'orders.all.full_access', 'customers.full_access',
     'users.manage', 'roles.manage', 'departments.manage',
     'analytics.full_access', 'reports.all.access',
     'system.settings', 'audit.logs.access'
   ],
   100, true, NOW(), NOW()),

  -- Warehouse FG Manager
  ('warehouse_fg_manager', 'หัวหน้าคลัง FG', 'จัดการสินค้าสำเร็จรูปและคลัง FG',
   ARRAY[
     'inventory.fg.full_access', 'inventory.fg.create', 'inventory.fg.update', 'inventory.fg.delete',
     'warehouse.fg.access', 'location.fg.manage',
     'orders.fg.view', 'orders.fg.process',
     'analytics.fg.access', 'reports.fg.generate',
     'movements.fg.view'
   ],
   80, true, NOW(), NOW()),

  -- Warehouse PK Manager
  ('warehouse_pk_manager', 'หัวหน้าคลัง PK', 'จัดการวัสดุบรรจุภัณฑ์และคลัง PK',
   ARRAY[
     'inventory.pk.full_access', 'inventory.pk.create', 'inventory.pk.update', 'inventory.pk.delete',
     'warehouse.pk.access', 'location.pk.manage',
     'orders.pk.view', 'orders.pk.process',
     'analytics.pk.access', 'reports.pk.generate',
     'movements.pk.view'
   ],
   80, true, NOW(), NOW()),

  -- Sales Manager
  ('sales_manager', 'หัวหน้าขาย', 'จัดการออเดอร์ ลูกค้า และรายงานการขาย',
   ARRAY[
     'orders.all.full_access', 'orders.create', 'orders.update', 'orders.delete',
     'customers.full_access', 'customers.create', 'customers.update',
     'inventory.all.view', 'inventory.levels.check',
     'analytics.sales.access', 'reports.sales.generate',
     'export.orders'
   ],
   70, true, NOW(), NOW()),

  -- Accounting Manager
  ('accounting_manager', 'หัวหน้าบัญชี', 'จัดการข้อมูลทางการเงินและรายงานบัญชี',
   ARRAY[
     'orders.financial.access', 'orders.costs.view',
     'customers.financial.view', 'customers.credit.manage',
     'inventory.costs.view', 'inventory.valuations.access',
     'analytics.financial.access', 'reports.financial.generate',
     'export.financial', 'audit.basic.access'
   ],
   70, true, NOW(), NOW()),

  -- Warehouse FG Staff
  ('warehouse_fg_staff', 'พนักงานคลัง FG', 'พนักงานปฏิบัติการคลัง FG',
   ARRAY[
     'inventory.fg.view', 'inventory.fg.update',
     'location.fg.view', 'location.fg.scan',
     'orders.fg.view', 'orders.fg.pick',
     'movements.fg.create', 'qr.scan'
   ],
   40, true, NOW(), NOW()),

  -- Warehouse PK Staff
  ('warehouse_pk_staff', 'พนักงานคลัง PK', 'พนักงานปฏิบัติการคลัง PK',
   ARRAY[
     'inventory.pk.view', 'inventory.pk.update',
     'location.pk.view', 'location.pk.scan',
     'orders.pk.view', 'orders.pk.pick',
     'movements.pk.create', 'qr.scan'
   ],
   40, true, NOW(), NOW()),

  -- Sales Staff
  ('sales_staff', 'พนักงานขาย', 'พนักงานขายและดูแลลูกค้า',
   ARRAY[
     'orders.create', 'orders.view', 'orders.update',
     'customers.view', 'customers.contact',
     'inventory.all.view', 'inventory.levels.check',
     'reports.sales.basic'
   ],
   30, true, NOW(), NOW()),

  -- Accounting Staff
  ('accounting_staff', 'พนักงานบัญชี', 'พนักงานบัญชีและการเงิน',
   ARRAY[
     'orders.financial.view', 'orders.costs.view',
     'customers.financial.view',
     'inventory.costs.view',
     'reports.financial.basic'
   ],
   30, true, NOW(), NOW())

ON CONFLICT (name) DO UPDATE SET
  name_thai = EXCLUDED.name_thai,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  level = EXCLUDED.level,
  updated_at = NOW();

-- 3. Create Access Control Helper Functions

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
  user_role_name TEXT,
  required_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  role_permissions TEXT[];
BEGIN
  SELECT permissions INTO role_permissions
  FROM public.roles
  WHERE name = user_role_name AND is_active = true;

  -- Super admin has all permissions
  IF 'admin.full_access' = ANY(role_permissions) THEN
    RETURN true;
  END IF;

  -- Check specific permission
  RETURN required_permission = ANY(role_permissions);
END;
$$ LANGUAGE plpgsql;

-- Function to get user permissions by role
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_role_name TEXT)
RETURNS TEXT[] AS $$
DECLARE
  role_permissions TEXT[];
BEGIN
  SELECT permissions INTO role_permissions
  FROM public.roles
  WHERE name = user_role_name AND is_active = true;

  RETURN COALESCE(role_permissions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- Function to check product type access
CREATE OR REPLACE FUNCTION public.user_can_access_product_type(
  user_role_name TEXT,
  product_type TEXT  -- 'FG' or 'PK'
) RETURNS BOOLEAN AS $$
DECLARE
  role_permissions TEXT[];
BEGIN
  SELECT permissions INTO role_permissions
  FROM public.roles
  WHERE name = user_role_name AND is_active = true;

  -- Super admin can access everything
  IF 'admin.full_access' = ANY(role_permissions) THEN
    RETURN true;
  END IF;

  -- Check product type specific access
  IF product_type = 'FG' THEN
    RETURN 'inventory.fg.full_access' = ANY(role_permissions)
           OR 'inventory.fg.view' = ANY(role_permissions)
           OR 'inventory.all.view' = ANY(role_permissions);
  ELSIF product_type = 'PK' THEN
    RETURN 'inventory.pk.full_access' = ANY(role_permissions)
           OR 'inventory.pk.view' = ANY(role_permissions)
           OR 'inventory.all.view' = ANY(role_permissions);
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Access Control Views

-- View for role-based inventory access
CREATE OR REPLACE VIEW public.accessible_inventory AS
SELECT
  ii.*,
  p.product_type,
  CASE
    WHEN p.product_type = 'FG' THEN 'warehouse_fg'
    WHEN p.product_type = 'PK' THEN 'warehouse_pk'
    ELSE 'unknown'
  END as responsible_department
FROM public.inventory_items ii
LEFT JOIN public.products p ON ii.sku = p.sku_code;

-- View for department summary
CREATE OR REPLACE VIEW public.department_summary AS
SELECT
  d.name,
  d.name_thai,
  d.color,
  COUNT(r.id) as role_count,
  CASE d.name
    WHEN 'warehouse_fg' THEN (
      SELECT COUNT(*) FROM public.accessible_inventory WHERE responsible_department = 'warehouse_fg'
    )
    WHEN 'warehouse_pk' THEN (
      SELECT COUNT(*) FROM public.accessible_inventory WHERE responsible_department = 'warehouse_pk'
    )
    ELSE 0
  END as item_count
FROM public.departments d
LEFT JOIN public.roles r ON (
  (d.name = 'warehouse_fg' AND r.name LIKE '%fg%') OR
  (d.name = 'warehouse_pk' AND r.name LIKE '%pk%') OR
  (d.name = 'sales' AND r.name LIKE '%sales%') OR
  (d.name = 'accounting' AND r.name LIKE '%accounting%') OR
  (d.name = 'admin' AND r.name LIKE '%admin%')
)
WHERE d.is_active = true
GROUP BY d.id, d.name, d.name_thai, d.color;

-- 5. Verification Queries
SELECT
  'Departments' as data_type,
  COUNT(*) as count
FROM public.departments
WHERE is_active = true

UNION ALL

SELECT
  'Roles' as data_type,
  COUNT(*) as count
FROM public.roles
WHERE is_active = true

UNION ALL

SELECT
  'Permissions (avg per role)' as data_type,
  ROUND(AVG(array_length(permissions, 1))::numeric, 1) as count
FROM public.roles
WHERE is_active = true;

-- Show department and role hierarchy
SELECT
  d.name_thai as department,
  r.name_thai as role,
  r.level,
  array_length(r.permissions, 1) as permission_count
FROM public.departments d
CROSS JOIN public.roles r
WHERE d.is_active = true
  AND r.is_active = true
  AND (
    (d.name = 'warehouse_fg' AND r.name LIKE '%fg%') OR
    (d.name = 'warehouse_pk' AND r.name LIKE '%pk%') OR
    (d.name = 'sales' AND r.name LIKE '%sales%') OR
    (d.name = 'accounting' AND r.name LIKE '%accounting%') OR
    (d.name = 'admin' AND r.name LIKE '%admin%')
  )
ORDER BY d.name, r.level DESC;