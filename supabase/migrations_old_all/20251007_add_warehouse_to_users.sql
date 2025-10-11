-- Migration: เพิ่ม warehouse access control ใน users table
-- Created: 2025-10-07
-- Description: เพิ่มความสามารถในการจำกัดการเข้าถึงข้อมูลตาม warehouse

-- ============================================================================
-- PART 1: เพิ่ม columns สำหรับ warehouse access control
-- ============================================================================

-- เพิ่ม warehouse_id และ access control flag
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS can_access_all_warehouses BOOLEAN DEFAULT false;

-- เพิ่ม comment อธิบาย columns
COMMENT ON COLUMN public.users.warehouse_id IS 'Warehouse ที่ user สังกัด - จำกัดการเข้าถึงข้อมูลเฉพาะ warehouse นี้';
COMMENT ON COLUMN public.users.can_access_all_warehouses IS 'Flag สำหรับ admin/manager ที่สามารถเข้าถึงทุก warehouse';

-- ============================================================================
-- PART 2: กำหนดสิทธิ์เริ่มต้น
-- ============================================================================

-- Admin และ Manager level สามารถเข้าถึงทุก warehouse
UPDATE public.users
SET can_access_all_warehouses = true
WHERE role_level <= 2 OR department = 'ผู้บริหาร';

-- กำหนด default warehouse ให้ users ที่ยังไม่มี warehouse
-- (เลือก warehouse แรกที่มีในระบบ)
DO $$
DECLARE
  default_warehouse_id UUID;
BEGIN
  -- หา warehouse แรก
  SELECT id INTO default_warehouse_id
  FROM public.warehouses
  WHERE is_active = true
  ORDER BY created_at
  LIMIT 1;

  -- ถ้ามี warehouse ให้กำหนดให้ users ที่ยังไม่มี
  IF default_warehouse_id IS NOT NULL THEN
    UPDATE public.users
    SET warehouse_id = default_warehouse_id
    WHERE warehouse_id IS NULL
      AND can_access_all_warehouses = false;
  END IF;
END $$;

-- ============================================================================
-- PART 3: สร้าง indexes สำหรับ performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_warehouse_id
  ON public.users(warehouse_id)
  WHERE warehouse_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_can_access_all
  ON public.users(can_access_all_warehouses)
  WHERE can_access_all_warehouses = true;

-- ============================================================================
-- PART 4: สร้าง helper function สำหรับตรวจสอบสิทธิ์
-- ============================================================================

-- Function: ตรวจสอบว่า user สามารถเข้าถึง warehouse ได้หรือไม่
CREATE OR REPLACE FUNCTION public.user_can_access_warehouse(
  p_user_id UUID,
  p_warehouse_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_can_access_all BOOLEAN;
  v_user_warehouse_id UUID;
BEGIN
  -- ดึงข้อมูล user
  SELECT
    can_access_all_warehouses,
    warehouse_id
  INTO
    v_can_access_all,
    v_user_warehouse_id
  FROM public.users
  WHERE id = p_user_id
    AND is_active = true;

  -- ถ้าไม่เจอ user หรือ user ไม่ active
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- ถ้าสามารถเข้าถึงทุก warehouse
  IF v_can_access_all = true THEN
    RETURN true;
  END IF;

  -- ถ้าเป็น warehouse เดียวกับที่ user สังกัด
  IF v_user_warehouse_id = p_warehouse_id THEN
    RETURN true;
  END IF;

  -- ไม่มีสิทธิ์เข้าถึง
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.user_can_access_warehouse(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.user_can_access_warehouse IS 'ตรวจสอบว่า user มีสิทธิ์เข้าถึง warehouse ที่ระบุหรือไม่';

-- ============================================================================
-- PART 5: อัปเดต sample users
-- ============================================================================

-- กำหนด warehouse ให้ sample users (ถ้ามี)
DO $$
DECLARE
  main_warehouse_id UUID;
BEGIN
  -- หา warehouse หลัก
  SELECT id INTO main_warehouse_id
  FROM public.warehouses
  WHERE code = 'MAIN' OR name LIKE '%หลัก%'
  ORDER BY created_at
  LIMIT 1;

  IF main_warehouse_id IS NOT NULL THEN
    -- Admin - เข้าถึงทุก warehouse
    UPDATE public.users
    SET
      warehouse_id = main_warehouse_id,
      can_access_all_warehouses = true
    WHERE username = 'admin';

    -- Warehouse Manager - เข้าถึงทุก warehouse
    UPDATE public.users
    SET
      warehouse_id = main_warehouse_id,
      can_access_all_warehouses = true
    WHERE username = 'warehouse_manager';

    -- Staff - เข้าถึงเฉพาะ warehouse ที่กำหนด
    UPDATE public.users
    SET
      warehouse_id = main_warehouse_id,
      can_access_all_warehouses = false
    WHERE username IN ('inventory_staff', 'purchasing_staff', 'qa_staff');
  END IF;
END $$;

-- ============================================================================
-- PART 6: สร้าง view สำหรับ user management ที่รวม warehouse info
-- ============================================================================

CREATE OR REPLACE VIEW public.users_with_warehouse_view AS
SELECT
  u.id,
  u.username,
  u.email,
  u.full_name,
  u.department,
  u.role,
  u.role_level,
  u.warehouse_id,
  u.can_access_all_warehouses,
  u.permissions,
  u.is_active,
  u.employee_code,
  u.phone,
  u.last_login,
  w.name as warehouse_name,
  w.code as warehouse_code,
  CASE
    WHEN u.can_access_all_warehouses THEN 'ทุกคลัง'
    WHEN w.name IS NOT NULL THEN w.name
    ELSE 'ไม่ระบุ'
  END as warehouse_display
FROM public.users u
LEFT JOIN public.warehouses w ON u.warehouse_id = w.id
ORDER BY u.role_level ASC, u.full_name ASC;

-- Grant access
GRANT SELECT ON public.users_with_warehouse_view TO authenticated;

COMMENT ON VIEW public.users_with_warehouse_view IS 'User management view รวมข้อมูล warehouse';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- แสดงผลลัพธ์การ migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Users with warehouse access:';
END $$;

-- แสดงข้อมูล users พร้อม warehouse
SELECT
  username,
  full_name,
  department,
  warehouse_display,
  can_access_all_warehouses as can_access_all,
  is_active
FROM public.users_with_warehouse_view
ORDER BY role_level;
