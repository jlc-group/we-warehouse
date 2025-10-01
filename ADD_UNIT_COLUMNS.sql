-- เพิ่มคอลัมน์สำหรับเก็บจำนวนแต่ละหน่วย
ALTER TABLE public.customer_exports
ADD COLUMN IF NOT EXISTS quantity_level1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_level2 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_level3 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_level1_name TEXT,
ADD COLUMN IF NOT EXISTS unit_level2_name TEXT,
ADD COLUMN IF NOT EXISTS unit_level3_name TEXT,
ADD COLUMN IF NOT EXISTS unit_level1_rate INTEGER,
ADD COLUMN IF NOT EXISTS unit_level2_rate INTEGER;

-- เพิ่ม comment อธิบายคอลัมน์
COMMENT ON COLUMN public.customer_exports.quantity_level1 IS 'จำนวนหน่วยระดับ 1 (ลัง)';
COMMENT ON COLUMN public.customer_exports.quantity_level2 IS 'จำนวนหน่วยระดับ 2 (กล่อง)';
COMMENT ON COLUMN public.customer_exports.quantity_level3 IS 'จำนวนหน่วยระดับ 3 (ชิ้น/เศษ)';
COMMENT ON COLUMN public.customer_exports.unit_level1_name IS 'ชื่อหน่วยระดับ 1 (เช่น ลัง, Carton)';
COMMENT ON COLUMN public.customer_exports.unit_level2_name IS 'ชื่อหน่วยระดับ 2 (เช่น กล่อง, Box)';
COMMENT ON COLUMN public.customer_exports.unit_level3_name IS 'ชื่อหน่วยระดับ 3 (เช่น ชิ้น, Piece)';
COMMENT ON COLUMN public.customer_exports.unit_level1_rate IS 'อัตราแปลงหน่วยระดับ 1 (จำนวนชิ้นต่อ 1 ลัง)';
COMMENT ON COLUMN public.customer_exports.unit_level2_rate IS 'อัตราแปลงหน่วยระดับ 2 (จำนวนชิ้นต่อ 1 กล่อง)';
