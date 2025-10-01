-- ============================================================================
-- 🚨 QUICK FIX: เพิ่ม product_code column ใน inventory_items
-- ============================================================================
-- แก้ไข ERROR: column "product_code" does not exist
-- ============================================================================

-- ตรวจสอบและเพิ่ม product_code column
DO $$
BEGIN
  -- ตรวจสอบว่า column product_code มีอยู่แล้วหรือไม่
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'inventory_items' 
      AND column_name = 'product_code'
  ) THEN
    -- เพิ่ม product_code column
    ALTER TABLE public.inventory_items 
      ADD COLUMN product_code TEXT;
    
    RAISE NOTICE '✅ Added product_code column to inventory_items';
    
    -- สร้าง index
    CREATE INDEX idx_inventory_items_product_code 
      ON public.inventory_items(product_code) 
      WHERE product_code IS NOT NULL;
    
    RAISE NOTICE '✅ Created index on product_code';
  ELSE
    RAISE NOTICE 'ℹ️ product_code column already exists';
  END IF;
END $$;

-- ตรวจสอบว่า product_code มีค่าหรือไม่ ถ้าไม่มีให้ใช้ product_name
UPDATE public.inventory_items
SET product_code = product_name
WHERE product_code IS NULL OR product_code = '';

-- Sync product_code จาก products table (ถ้าตาราง products มีอยู่)
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_name = 'products'
  ) THEN
    -- Update product_code โดยเทียบจาก product_name
    UPDATE public.inventory_items inv
    SET product_code = p.sku_code
    FROM public.products p
    WHERE inv.product_name = p.product_name 
      AND p.sku_code IS NOT NULL
      AND p.sku_code != '';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Synced % records from products table', updated_count;
  ELSE
    RAISE NOTICE 'ℹ️ Products table does not exist, skipping sync';
  END IF;
END $$;

-- เพิ่ม sku column ถ้ายังไม่มี
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'inventory_items' 
      AND column_name = 'sku'
  ) THEN
    ALTER TABLE public.inventory_items ADD COLUMN sku TEXT;
    RAISE NOTICE '✅ Added sku column to inventory_items';
  END IF;
END $$;

-- ตรวจสอบผลลัพธ์
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventory_items'
  AND column_name IN ('product_code', 'sku', 'product_name', 'product_id')
ORDER BY column_name;

-- นับจำนวน records ที่มี product_code
SELECT 
  COUNT(*) as total_records,
  COUNT(product_code) as records_with_product_code,
  COUNT(*) - COUNT(product_code) as records_without_product_code
FROM public.inventory_items;

-- ============================================================================
SELECT '✅ QUICK FIX COMPLETED!

✓ เพิ่ม product_code column แล้ว
✓ สร้าง index แล้ว
✓ Sync ข้อมูลจาก products table แล้ว

ตอนนี้คุณสามารถ:
- Query ด้วย product_code ได้แล้ว
- เลือก location พร้อม filter product_code ได้
- ใช้งาน API endpoint ที่มี product_code ได้

กรุณา refresh React app และลองอีกครั้ง!
' as status;
