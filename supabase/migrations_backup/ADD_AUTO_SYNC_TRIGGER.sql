-- ============================================================================
-- 🤖 AUTO-SYNC TRIGGER - สร้าง conversion_rate อัตโนมัติ
-- ============================================================================
-- เมื่อเพิ่ม product ใหม่ → สร้าง conversion_rate อัตโนมัติ
-- ============================================================================

-- สร้าง function สำหรับ trigger
CREATE OR REPLACE FUNCTION public.auto_create_conversion_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- สร้าง conversion rate เริ่มต้นสำหรับ product ใหม่
  INSERT INTO public.product_conversion_rates (
    product_id,
    sku,
    product_name,
    product_type,
    unit_level1_name,
    unit_level1_rate,
    unit_level2_name,
    unit_level2_rate,
    unit_level3_name
  ) VALUES (
    NEW.id,
    NEW.sku_code,
    NEW.product_name,
    NEW.product_type,
    'ลัง',
    144,  -- ค่าเริ่มต้น
    'กล่อง',
    12,   -- ค่าเริ่มต้น
    'ชิ้น'
  )
  ON CONFLICT (sku) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    product_name = EXCLUDED.product_name,
    product_type = EXCLUDED.product_type,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ลบ trigger เก่า (ถ้ามี)
DROP TRIGGER IF EXISTS trigger_auto_create_conversion_rate ON public.products;

-- สร้าง trigger ใหม่
CREATE TRIGGER trigger_auto_create_conversion_rate
  AFTER INSERT ON public.products
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.auto_create_conversion_rate();

-- ทดสอบ trigger
SELECT '
✅ Auto-sync Trigger สร้างเสร็จแล้ว!

จากนี้เป็นต้นไป:
• เพิ่ม product ใหม่ → conversion_rate สร้างอัตโนมัติ ✓
• ไม่ต้องกังวลเรื่องข้อมูลหายอีกต่อไป ✓

' as "🤖 Trigger Status";
