-- ========================================
-- Migration: เพิ่มฟิลด์ LOT และ FIFO Support
-- ========================================
-- Purpose: รองรับระบบ FIFO (First In First Out) ตาม LOT Number
-- Date: 2025-01-09

-- เพิ่ม columns สำหรับ LOT tracking
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS lot_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS manufacturing_date DATE,
ADD COLUMN IF NOT EXISTS batch_code VARCHAR(50);

-- สร้าง Index เพื่อ Performance ในการค้นหาและเรียงลำดับ
CREATE INDEX IF NOT EXISTS idx_inventory_items_received_date 
ON inventory_items(received_date ASC);

CREATE INDEX IF NOT EXISTS idx_inventory_items_lot_number 
ON inventory_items(lot_number);

CREATE INDEX IF NOT EXISTS idx_inventory_items_sku_received 
ON inventory_items(sku, received_date ASC);

CREATE INDEX IF NOT EXISTS idx_inventory_items_expiry 
ON inventory_items(expiry_date) 
WHERE expiry_date IS NOT NULL;

-- Comment
COMMENT ON COLUMN inventory_items.lot_number IS 'หมายเลข LOT/Batch สำหรับ FIFO tracking';
COMMENT ON COLUMN inventory_items.received_date IS 'วันที่รับสินค้าเข้าคลัง - ใช้สำหรับ FIFO';
COMMENT ON COLUMN inventory_items.expiry_date IS 'วันหมดอายุของสินค้า';
COMMENT ON COLUMN inventory_items.manufacturing_date IS 'วันที่ผลิต';
COMMENT ON COLUMN inventory_items.batch_code IS 'รหัส Batch จากโรงงาน';

-- Update existing records ให้มี received_date (ถ้ายังไม่มี)
UPDATE inventory_items
SET received_date = created_at
WHERE received_date IS NULL;

-- สร้าง Function สำหรับ generate LOT number อัตโนมัติ
CREATE OR REPLACE FUNCTION generate_lot_number(sku_code VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  date_part VARCHAR;
  sequence_num INTEGER;
  new_lot VARCHAR;
BEGIN
  -- รูปแบบ: SKU-YYMMDD-001
  date_part := TO_CHAR(NOW(), 'YYMMDD');
  
  -- หาลำดับถัดไป
  SELECT COALESCE(MAX(
    CASE 
      WHEN lot_number ~ (sku_code || '-' || date_part || '-[0-9]+')
      THEN CAST(SUBSTRING(lot_number FROM '[0-9]+$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM inventory_items
  WHERE sku = sku_code;
  
  new_lot := sku_code || '-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN new_lot;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON FUNCTION generate_lot_number IS 'สร้างหมายเลข LOT อัตโนมัติในรูปแบบ SKU-YYMMDD-001';

-- สร้าง View สำหรับดูข้อมูล LOT ที่ใกล้หมดอายุ
CREATE OR REPLACE VIEW inventory_expiring_soon AS
SELECT 
  id,
  sku,
  product_name,
  location,
  lot_number,
  received_date,
  expiry_date,
  (expiry_date - CURRENT_DATE) as days_to_expiry,
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity,
  warehouse_id
FROM inventory_items
WHERE expiry_date IS NOT NULL
  AND expiry_date > CURRENT_DATE
  AND (expiry_date - CURRENT_DATE) <= 90  -- 90 วันก่อนหมดอายุ
ORDER BY expiry_date ASC;

COMMENT ON VIEW inventory_expiring_soon IS 'แสดงสินค้าที่ใกล้หมดอายุภายใน 90 วัน';

-- สร้าง View สำหรับ FIFO Report
CREATE OR REPLACE VIEW inventory_fifo_order AS
SELECT 
  id,
  sku,
  product_name,
  location,
  lot_number,
  received_date,
  expiry_date,
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity,
  unit_level1_rate,
  unit_level2_rate,
  warehouse_id,
  ROW_NUMBER() OVER (PARTITION BY sku ORDER BY received_date ASC, lot_number ASC) as fifo_sequence
FROM inventory_items
WHERE (unit_level1_quantity > 0 OR unit_level2_quantity > 0 OR unit_level3_quantity > 0)
ORDER BY sku, received_date ASC;

COMMENT ON VIEW inventory_fifo_order IS 'แสดงลำดับการหยิบสินค้าตาม FIFO (เข้าก่อน ออกก่อน)';

-- สร้างตัวอย่างข้อมูล LOT (Optional - สำหรับ testing)
-- คุณสามารถลบส่วนนี้ออกได้ถ้าไม่ต้องการ
DO $$
DECLARE
  v_record RECORD;
  v_random_days INTEGER;
BEGIN
  -- Update existing inventory items with sample LOT data
  FOR v_record IN 
    SELECT id, sku, created_at 
    FROM inventory_items 
    WHERE lot_number IS NULL
    LIMIT 50  -- จำกัดแค่ 50 รายการแรก
  LOOP
    -- สุ่มวันที่ย้อนหลัง 1-180 วัน
    v_random_days := FLOOR(RANDOM() * 180 + 1)::INTEGER;
    
    UPDATE inventory_items
    SET 
      lot_number = generate_lot_number(v_record.sku),
      received_date = v_record.created_at - MAKE_INTERVAL(days => v_random_days),
      manufacturing_date = v_record.created_at - MAKE_INTERVAL(days => v_random_days + 7),
      expiry_date = (v_record.created_at + MAKE_INTERVAL(days => 365 - v_random_days))::DATE
    WHERE id = v_record.id;
  END LOOP;
END $$;

-- ตรวจสอบผลลัพธ์
SELECT 
  'Total inventory items' as metric,
  COUNT(*) as count
FROM inventory_items
UNION ALL
SELECT 
  'Items with LOT number',
  COUNT(*) 
FROM inventory_items 
WHERE lot_number IS NOT NULL
UNION ALL
SELECT 
  'Items with expiry date',
  COUNT(*) 
FROM inventory_items 
WHERE expiry_date IS NOT NULL;

-- แสดงตัวอย่าง FIFO order
SELECT 
  sku,
  lot_number,
  received_date,
  expiry_date,
  fifo_sequence,
  location
FROM inventory_fifo_order
LIMIT 10;
