-- เพิ่มฟิลด์สำหรับหน่วยหลายระดับในตาราง inventory_items

-- เพิ่มฟิลด์สำหรับ multi-level units
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS unit_level1_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_level2_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_level3_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_level1_name TEXT,
ADD COLUMN IF NOT EXISTS unit_level2_name TEXT,
ADD COLUMN IF NOT EXISTS unit_level3_name TEXT DEFAULT 'ชิ้น',
ADD COLUMN IF NOT EXISTS unit_level1_rate INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_level2_rate INTEGER DEFAULT 0;

-- เพิ่ม constraint เพื่อให้แน่ใจว่าค่าไม่เป็นลบ
ALTER TABLE public.inventory_items
ADD CONSTRAINT inventory_items_multi_units_positive CHECK (
  unit_level1_quantity >= 0 AND
  unit_level2_quantity >= 0 AND
  unit_level3_quantity >= 0 AND
  unit_level1_rate >= 0 AND
  unit_level2_rate >= 0
);

-- แปลงข้อมูลเดิมให้เข้ากับระบบใหม่ (map box_quantity -> unit_level2_quantity, loose_quantity -> unit_level3_quantity)
UPDATE public.inventory_items
SET
  unit_level2_quantity = COALESCE(box_quantity, 0),
  unit_level3_quantity = COALESCE(loose_quantity, 0),
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น'
WHERE unit_level2_quantity IS NULL OR unit_level3_quantity IS NULL;

-- ตรวจสอบผลลัพธ์
SELECT 'เพิ่มฟิลด์หน่วยหลายระดับสำเร็จ!' as status;
SELECT
  sku,
  product_name,
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity,
  unit_level1_name,
  unit_level2_name,
  unit_level3_name,
  unit_level1_rate,
  unit_level2_rate
FROM public.inventory_items
LIMIT 5;