-- ============================================================================
-- FIX INVENTORY_ITEMS TABLE - Complete Fix
-- ============================================================================
-- แก้ปัญหา:
-- 1. Error 400 เมื่อเรียกข้อมูล inventory_items
-- 2. ไม่สามารถเลือก location ได้
-- 3. RLS ยังเปิดอยู่ทำให้ไม่สามารถเข้าถึงข้อมูลได้
-- 4. Column names อาจไม่ตรงกับที่โค้ดเรียกใช้
-- ============================================================================

-- STEP 1: ตรวจสอบว่าตาราง inventory_items มีอยู่หรือไม่
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items' AND table_schema = 'public') THEN
    -- สร้างตารางใหม่ถ้ายังไม่มี
    CREATE TABLE public.inventory_items (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      product_name TEXT NOT NULL,
      product_code TEXT NOT NULL,
      sku TEXT, -- เพิ่ม SKU column
      location TEXT NOT NULL,
      lot TEXT,
      mfd DATE,
      
      -- Legacy columns (เก็บไว้เพื่อ backward compatibility)
      quantity_boxes INTEGER DEFAULT 0,
      quantity_loose INTEGER DEFAULT 0,
      
      -- Multi-level unit columns (ระบบใหม่)
      unit_level1_name TEXT DEFAULT 'ลัง',
      unit_level1_quantity INTEGER DEFAULT 0,
      unit_level1_rate INTEGER DEFAULT 0,
      unit_level2_name TEXT DEFAULT 'กล่อง',
      unit_level2_quantity INTEGER DEFAULT 0,
      unit_level2_rate INTEGER DEFAULT 0,
      unit_level3_name TEXT DEFAULT 'ชิ้น',
      unit_level3_quantity INTEGER DEFAULT 0,
      
      -- Soft delete support
      is_deleted BOOLEAN DEFAULT FALSE,
      
      -- Metadata
      user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE 'Created inventory_items table';
  ELSE
    RAISE NOTICE 'inventory_items table already exists';
  END IF;
END $$;

-- STEP 2: เพิ่ม columns ที่อาจหายไป (ถ้ายังไม่มี)
ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS unit_level1_name TEXT DEFAULT 'ลัง',
  ADD COLUMN IF NOT EXISTS unit_level1_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_level1_rate INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_level2_name TEXT DEFAULT 'กล่อง',
  ADD COLUMN IF NOT EXISTS unit_level2_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_level2_rate INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_level3_name TEXT DEFAULT 'ชิ้น',
  ADD COLUMN IF NOT EXISTS unit_level3_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- STEP 3: เพิ่ม indexes ที่จำเป็น
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON public.inventory_items(location);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_code ON public.inventory_items(product_code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON public.inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_deleted ON public.inventory_items(is_deleted);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON public.inventory_items(is_deleted, location) WHERE is_deleted = FALSE;

-- STEP 4: ปิด RLS (Row Level Security) สำหรับการพัฒนา
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;

-- STEP 5: ลบ RLS policies เก่าทั้งหมด
DROP POLICY IF EXISTS "Users can view own inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can create own inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can update own inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can delete own inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can view inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can view active inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can view deleted inventory items for audit" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can insert inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can update inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can delete inventory items" ON public.inventory_items;

-- STEP 6: ให้สิทธิ์เต็มแก่ทุก role
GRANT ALL ON public.inventory_items TO anon;
GRANT ALL ON public.inventory_items TO authenticated;

-- STEP 7: สร้าง trigger สำหรับ updated_at
CREATE OR REPLACE FUNCTION public.update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_updated_at();

-- STEP 8: สร้าง view สำหรับ active items
CREATE OR REPLACE VIEW public.active_inventory_items AS
SELECT *
FROM public.inventory_items
WHERE is_deleted = FALSE;

GRANT SELECT ON public.active_inventory_items TO anon;
GRANT SELECT ON public.active_inventory_items TO authenticated;

-- STEP 9: Sync ข้อมูล legacy columns กับ multi-level columns (ถ้ามีข้อมูลเก่า)
UPDATE public.inventory_items
SET 
  unit_level1_quantity = COALESCE(quantity_boxes, 0),
  unit_level3_quantity = COALESCE(quantity_loose, 0)
WHERE unit_level1_quantity = 0 AND unit_level3_quantity = 0 
  AND (quantity_boxes > 0 OR quantity_loose > 0);

-- STEP 10: เพิ่ม comments สำหรับ documentation
COMMENT ON TABLE public.inventory_items IS 'ตารางเก็บข้อมูลสินค้าในคลัง - รองรับระบบ multi-level units';
COMMENT ON COLUMN public.inventory_items.product_code IS 'รหัสสินค้า - ใช้สำหรับค้นหาและอ้างอิง';
COMMENT ON COLUMN public.inventory_items.sku IS 'SKU code - รหัส SKU ของสินค้า';
COMMENT ON COLUMN public.inventory_items.location IS 'ตำแหน่งในคลัง - รูปแบบ A/1/01';
COMMENT ON COLUMN public.inventory_items.quantity_boxes IS 'จำนวนกล่อง (Legacy - เก็บไว้เพื่อ backward compatibility)';
COMMENT ON COLUMN public.inventory_items.quantity_loose IS 'จำนวนชิ้นเศษ (Legacy - เก็บไว้เพื่อ backward compatibility)';
COMMENT ON COLUMN public.inventory_items.unit_level1_name IS 'ชื่อหน่วยระดับ 1 (เช่น ลัง)';
COMMENT ON COLUMN public.inventory_items.unit_level1_quantity IS 'จำนวนหน่วยระดับ 1';
COMMENT ON COLUMN public.inventory_items.unit_level1_rate IS 'อัตราแปลงหน่วยระดับ 1 เป็นหน่วยพื้นฐาน';
COMMENT ON COLUMN public.inventory_items.is_deleted IS 'Soft delete flag - TRUE = ถูกลบแล้วแต่เก็บไว้ในระบบ';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- ตรวจสอบโครงสร้างตาราง
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inventory_items' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ตรวจสอบ RLS status
SELECT 
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN 'RLS ENABLED ⚠️' ELSE 'RLS DISABLED ✅' END as rls_status
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE tablename = 'inventory_items' AND schemaname = 'public';

-- ตรวจสอบ permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'inventory_items' 
  AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- แสดงข้อมูลตัวอย่าง
SELECT 
  id,
  product_name,
  product_code,
  location,
  quantity_boxes,
  quantity_loose,
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity,
  is_deleted
FROM public.inventory_items
WHERE is_deleted = FALSE
LIMIT 5;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '🎉 INVENTORY_ITEMS TABLE FIX COMPLETED!

✅ ตารางถูกสร้างหรืออัพเดตเรียบร้อยแล้ว
✅ เพิ่ม columns สำหรับระบบ multi-level units
✅ รองรับทั้ง legacy columns และ columns ใหม่
✅ ปิด RLS สำหรับการพัฒนา
✅ ให้สิทธิ์เต็มแก่ anon และ authenticated
✅ เพิ่ม soft delete support
✅ สร้าง indexes สำหรับการค้นหาที่รวดเร็ว

ตอนนี้คุณสามารถ:
- เลือก location ได้แล้ว
- ค้นหาด้วย product_code ได้
- ใช้งาน multi-level units ได้
- Soft delete รายการได้

กรุณา refresh React app และทดสอบอีกครั้ง!
' as status;
