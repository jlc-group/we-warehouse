-- แก้ไขโครงสร้างตาราง inventory_items ให้ชัดเจน
-- เปลี่ยนชื่อคอลัมน์เก่าและเพิ่มฟิลด์ใหม่

-- ลบ constraint เก่าก่อน (ถ้ามี)
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_multi_units_positive;

-- เปลี่ยนชื่อคอลัมน์เก่าให้ชัดเจน (backward compatibility)
ALTER TABLE public.inventory_items
RENAME COLUMN box_quantity TO carton_quantity_legacy;    -- ลัง (เก่า)
ALTER TABLE public.inventory_items
RENAME COLUMN loose_quantity TO box_quantity_legacy;     -- กล่อง (เก่า)

-- เพิ่มคอลัมน์ pieces_quantity สำหรับชิ้น (legacy ที่ขาดไป)
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS pieces_quantity_legacy INTEGER DEFAULT 0;

-- เพิ่มฟิลด์ multi-level units ที่ขาดไป (ลัง → กล่อง → ชิ้น)
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS unit_level1_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_level2_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_level3_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_level1_name TEXT,
ADD COLUMN IF NOT EXISTS unit_level2_name TEXT,
ADD COLUMN IF NOT EXISTS unit_level3_name TEXT DEFAULT 'ชิ้น',
ADD COLUMN IF NOT EXISTS unit_level1_rate INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_level2_rate INTEGER DEFAULT 0;

-- สร้าง constraint ใหม่ที่รวมฟิลด์ทั้งหมด
ALTER TABLE public.inventory_items
ADD CONSTRAINT inventory_items_multi_units_positive CHECK (
  unit_level1_quantity >= 0 AND
  unit_level2_quantity >= 0 AND
  unit_level3_quantity >= 0 AND
  unit_level1_rate >= 0 AND
  unit_level2_rate >= 0
);

-- แปลงข้อมูลเดิมให้เข้ากับระบบใหม่ (map ข้อมูลเก่า → ระบบ 3 ระดับ)
-- การ mapping ที่ถูกต้อง: box_quantity เดิม = ลัง, loose_quantity เดิม = กล่อง
-- หมายเหตุ: ยังไม่เปลี่ยนชื่อคอลัมน์ เพราะต้องใช้ชื่อเดิมก่อน
UPDATE public.inventory_items
SET
  unit_level1_quantity = COALESCE(box_quantity, 0),      -- ลัง (จาก box_quantity เดิม)
  unit_level2_quantity = COALESCE(loose_quantity, 0),    -- กล่อง (จาก loose_quantity เดิม)
  unit_level3_quantity = 0,                              -- ชิ้น (ยังไม่มีข้อมูลเก่า)
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น'
WHERE (unit_level1_quantity IS NULL OR unit_level2_quantity IS NULL OR unit_level3_quantity IS NULL)
  AND (box_quantity > 0 OR loose_quantity > 0);

-- ตรวจสอบโครงสร้างตารางหลังแก้ไข
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'inventory_items'
  AND table_schema = 'public'
  AND (column_name LIKE '%unit_level%' OR column_name LIKE '%quantity%')
ORDER BY column_name;

-- ตรวจสอบข้อมูลตัวอย่างหลังแก้ไข
SELECT
  sku,
  product_name,
  -- คอลัมน์เก่า (legacy) - หลังเปลี่ยนชื่อ
  carton_quantity_legacy,
  box_quantity_legacy,
  pieces_quantity_legacy,
  -- คอลัมน์ใหม่ (ระบบหลัก) - ที่ถูก map แล้ว
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity,
  unit_level1_name,
  unit_level2_name,
  unit_level3_name,
  unit_level1_rate,
  unit_level2_rate
FROM public.inventory_items
WHERE carton_quantity_legacy > 0 OR box_quantity_legacy > 0 OR pieces_quantity_legacy > 0
   OR unit_level1_quantity > 0 OR unit_level2_quantity > 0 OR unit_level3_quantity > 0
LIMIT 5;

-- ตรวจสอบผลลัพธ์
SELECT 'แก้ไขฟิลด์ multi-level units ครบถ้วนสำเร็จ!' as status;