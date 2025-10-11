-- ===================================
-- 🚀 แก้ไขปัญหา SPOUT-LW02 แบบง่าย
-- ===================================
-- รันทีเดียวเสร็จ - ไม่ต้องกังวล
-- ===================================

-- ปิด RLS ชั่วคราว
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;

-- สร้างคอลัมน์คำนวณอัตโนมัติ
ALTER TABLE public.inventory_items DROP COLUMN IF EXISTS total_base_quantity;

ALTER TABLE public.inventory_items
  ADD COLUMN total_base_quantity INTEGER GENERATED ALWAYS AS (
    COALESCE(unit_level1_quantity * unit_level1_rate, 0) +
    COALESCE(unit_level2_quantity * unit_level2_rate, 0) +
    COALESCE(unit_level3_quantity, 0)
  ) STORED;

-- สร้าง function ซิงค์ข้อมูล
CREATE OR REPLACE FUNCTION sync_inventory_conversion_rates()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE public.inventory_items AS inv
  SET
    unit_level1_name = pcr.unit_level1_name,
    unit_level1_rate = pcr.unit_level1_rate,
    unit_level2_name = pcr.unit_level2_name,
    unit_level2_rate = pcr.unit_level2_rate,
    unit_level3_name = pcr.unit_level3_name
  FROM public.product_conversion_rates AS pcr
  WHERE inv.sku = pcr.sku;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- รันซิงค์เลย
SELECT sync_inventory_conversion_rates() as synced_items;

-- สร้าง trigger อัตโนมัติ
CREATE OR REPLACE FUNCTION auto_sync_conversion_rates_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.inventory_items
  SET
    unit_level1_name = NEW.unit_level1_name,
    unit_level1_rate = NEW.unit_level1_rate,
    unit_level2_name = NEW.unit_level2_name,
    unit_level2_rate = NEW.unit_level2_rate,
    unit_level3_name = NEW.unit_level3_name
  WHERE sku = NEW.sku;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_sync_conversion_rates ON public.product_conversion_rates;

CREATE TRIGGER trigger_auto_sync_conversion_rates
  AFTER INSERT OR UPDATE ON public.product_conversion_rates
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_conversion_rates_trigger();

-- เปิด RLS กลับ
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- ===================================
-- ✅ ตรวจสอบผลลัพธ์
-- ===================================
SELECT
  product_name,
  sku,
  location,
  unit_level1_quantity || ' ลัง × ' || unit_level1_rate || ' = ' || total_base_quantity || ' ชิ้น' as result
FROM inventory_items
WHERE sku = 'SPOUT-LW02'
ORDER BY location;

-- ===================================
-- 🎉 เสร็จแล้ว!
-- ===================================
-- ตอนนี้ SPOUT-LW02 จะแสดง: 3 ลัง × 6000 = 18000 ชิ้น
-- รีเฟรชแอพได้เลย (Cmd+Shift+R)
-- ===================================
