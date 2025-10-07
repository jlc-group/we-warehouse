-- สร้างคลังเริ่มต้นในระบบ
-- Migration: 20251007_create_initial_warehouse

-- สร้างคลังหลักที่ครอบคลุมทุก location prefix (A-Z)
INSERT INTO warehouses (
  name,
  code,
  description,
  address,
  location_prefix_start,
  location_prefix_end,
  max_levels,
  max_positions,
  is_active
)
VALUES (
  'คลังสินค้าหลัก',
  'WH-MAIN',
  'คลังสินค้าหลัก รองรับทุกประเภทสินค้า (A-Z)',
  'พื้นที่จัดเก็บหลัก',
  'A',
  'Z',
  20,
  4,
  true
)
ON CONFLICT (code) DO NOTHING;

-- เชื่อมโยงรายการสินค้าที่มีอยู่เข้ากับคลังหลัก
UPDATE inventory_items
SET warehouse_id = (SELECT id FROM warehouses WHERE code = 'WH-MAIN' LIMIT 1)
WHERE warehouse_id IS NULL;

-- เชื่อมโยง warehouse_locations เข้ากับคลังหลัก
UPDATE warehouse_locations
SET warehouse_id = (SELECT id FROM warehouses WHERE code = 'WH-MAIN' LIMIT 1)
WHERE warehouse_id IS NULL;

-- แสดงสรุปผล
DO $$
DECLARE
  v_warehouse_id UUID;
  v_inventory_count INT;
  v_location_count INT;
BEGIN
  SELECT id INTO v_warehouse_id FROM warehouses WHERE code = 'WH-MAIN';

  SELECT COUNT(*) INTO v_inventory_count FROM inventory_items WHERE warehouse_id = v_warehouse_id;
  SELECT COUNT(*) INTO v_location_count FROM warehouse_locations WHERE warehouse_id = v_warehouse_id;

  RAISE NOTICE '✅ สร้างคลัง WH-MAIN สำเร็จ';
  RAISE NOTICE '   Warehouse ID: %', v_warehouse_id;
  RAISE NOTICE '   รายการสินค้า: % รายการ', v_inventory_count;
  RAISE NOTICE '   ตำแหน่ง: % locations', v_location_count;
END $$;
