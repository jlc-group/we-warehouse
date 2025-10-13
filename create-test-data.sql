-- ============================================================================
-- CREATE TEST DATA FOR RESERVED STOCK SYSTEM
-- สร้างข้อมูลทดสอบ - ไม่กระทบข้อมูลจริง
-- ============================================================================

-- ============================================================================
-- STEP 1: สร้าง Test Warehouse (ถ้ายังไม่มี)
-- ============================================================================

INSERT INTO public.warehouses (id, code, name, address, is_active, created_at)
VALUES (
  'test-warehouse-001',
  'TEST',
  'Test Warehouse - Reserved Stock',
  'Test Address',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: สร้าง Test Product (ถ้ายังไม่มี)
-- ============================================================================

INSERT INTO public.products (
  id,
  sku_code,
  product_name,
  product_type,
  is_active,
  category,
  unit_of_measure,
  created_at
)
VALUES (
  'test-product-001',
  'TEST-001',
  'TEST - สินค้าทดสอบระบบจองสต็อก',
  'finished_goods',
  true,
  'Test Category',
  'ชิ้น',
  NOW()
)
ON CONFLICT (sku_code) DO NOTHING;

-- ============================================================================
-- STEP 3: สร้าง Test Inventory Items (3 รายการ)
-- ============================================================================

-- Item 1: มีสต็อกเยอะ (1000 ชิ้น)
INSERT INTO public.inventory_items (
  id,
  product_name,
  sku,
  location,
  lot,
  mfd,
  total_base_quantity,
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity,
  unit_level1_name,
  unit_level2_name,
  unit_level3_name,
  unit_level1_rate,
  unit_level2_rate,
  warehouse_id,
  reserved_quantity,
  reserved_level1_quantity,
  reserved_level2_quantity,
  reserved_level3_quantity,
  is_deleted,
  created_at
)
VALUES (
  'test-inventory-001',
  'TEST - สินค้าทดสอบระบบจองสต็อก',
  'TEST-001',
  'TEST-A01-01',
  'TEST-LOT-001',
  CURRENT_DATE,
  1000,  -- total_base_quantity
  10,    -- ลัง
  0,     -- กล่อง
  0,     -- ชิ้น
  'ลัง',
  'กล่อง',
  'ชิ้น',
  100,   -- 1 ลัง = 100 ชิ้น
  10,    -- 1 กล่อง = 10 ชิ้น
  'test-warehouse-001',
  0,     -- reserved_quantity
  0,     -- reserved_level1
  0,     -- reserved_level2
  0,     -- reserved_level3
  false,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Item 2: มีสต็อกปานกลาง (500 ชิ้น)
INSERT INTO public.inventory_items (
  id,
  product_name,
  sku,
  location,
  lot,
  mfd,
  total_base_quantity,
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity,
  unit_level1_name,
  unit_level2_name,
  unit_level3_name,
  unit_level1_rate,
  unit_level2_rate,
  warehouse_id,
  reserved_quantity,
  reserved_level1_quantity,
  reserved_level2_quantity,
  reserved_level3_quantity,
  is_deleted,
  created_at
)
VALUES (
  'test-inventory-002',
  'TEST - สินค้าทดสอบระบบจองสต็อก',
  'TEST-001',
  'TEST-A01-02',
  'TEST-LOT-002',
  CURRENT_DATE,
  500,   -- total_base_quantity
  5,     -- ลัง
  0,     -- กล่อง
  0,     -- ชิ้น
  'ลัง',
  'กล่อง',
  'ชิ้น',
  100,
  10,
  'test-warehouse-001',
  0,
  0,
  0,
  0,
  false,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Item 3: มีสต็อกน้อย (100 ชิ้น)
INSERT INTO public.inventory_items (
  id,
  product_name,
  sku,
  location,
  lot,
  mfd,
  total_base_quantity,
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity,
  unit_level1_name,
  unit_level2_name,
  unit_level3_name,
  unit_level1_rate,
  unit_level2_rate,
  warehouse_id,
  reserved_quantity,
  reserved_level1_quantity,
  reserved_level2_quantity,
  reserved_level3_quantity,
  is_deleted,
  created_at
)
VALUES (
  'test-inventory-003',
  'TEST - สินค้าทดสอบระบบจองสต็อก',
  'TEST-001',
  'TEST-A01-03',
  'TEST-LOT-003',
  CURRENT_DATE,
  100,   -- total_base_quantity
  1,     -- ลัง
  0,     -- กล่อง
  0,     -- ชิ้น
  'ลัง',
  'กล่อง',
  'ชิ้น',
  100,
  10,
  'test-warehouse-001',
  0,
  0,
  0,
  0,
  false,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 4: สร้าง Test Reservations (3 สถานะต่างๆ)
-- ============================================================================

-- Reservation 1: Active (กำลังจอง)
INSERT INTO public.stock_reservations (
  id,
  inventory_item_id,
  fulfillment_item_id,
  warehouse_code,
  location,
  reserved_level1_quantity,
  reserved_level2_quantity,
  reserved_level3_quantity,
  reserved_total_quantity,
  unit_level1_name,
  unit_level2_name,
  unit_level3_name,
  status,
  reservation_type,
  reserved_at,
  reserved_by,
  notes,
  created_at
)
VALUES (
  'test-reservation-001',
  'test-inventory-001',
  NULL,
  'TEST',
  'TEST-A01-01',
  0,    -- ลัง
  0,    -- กล่อง
  50,   -- ชิ้น
  50,   -- total
  'ลัง',
  'กล่อง',
  'ชิ้น',
  'active',
  'fulfillment',
  NOW() - INTERVAL '1 hour',
  NULL,
  'Test active reservation',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Update inventory reserved quantity
UPDATE public.inventory_items
SET
  reserved_quantity = 50,
  reserved_level3_quantity = 50
WHERE id = 'test-inventory-001';

-- Reservation 2: Fulfilled (จัดส่งแล้ว)
INSERT INTO public.stock_reservations (
  id,
  inventory_item_id,
  fulfillment_item_id,
  warehouse_code,
  location,
  reserved_level1_quantity,
  reserved_level2_quantity,
  reserved_level3_quantity,
  reserved_total_quantity,
  unit_level1_name,
  unit_level2_name,
  unit_level3_name,
  status,
  reservation_type,
  reserved_at,
  reserved_by,
  fulfilled_at,
  fulfilled_by,
  notes,
  created_at
)
VALUES (
  'test-reservation-002',
  'test-inventory-002',
  NULL,
  'TEST',
  'TEST-A01-02',
  0,
  0,
  30,
  30,
  'ลัง',
  'กล่อง',
  'ชิ้น',
  'fulfilled',
  'fulfillment',
  NOW() - INTERVAL '2 hours',
  NULL,
  NOW() - INTERVAL '1 hour',
  NULL,
  'Test fulfilled reservation',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Reservation 3: Cancelled (ยกเลิกแล้ว)
INSERT INTO public.stock_reservations (
  id,
  inventory_item_id,
  fulfillment_item_id,
  warehouse_code,
  location,
  reserved_level1_quantity,
  reserved_level2_quantity,
  reserved_level3_quantity,
  reserved_total_quantity,
  unit_level1_name,
  unit_level2_name,
  unit_level3_name,
  status,
  reservation_type,
  reserved_at,
  reserved_by,
  cancelled_at,
  cancelled_by,
  notes,
  created_at
)
VALUES (
  'test-reservation-003',
  'test-inventory-003',
  NULL,
  'TEST',
  'TEST-A01-03',
  0,
  0,
  20,
  20,
  'ลัง',
  'กล่อง',
  'ชิ้น',
  'cancelled',
  'fulfillment',
  NOW() - INTERVAL '3 hours',
  NULL,
  NOW() - INTERVAL '2 hours',
  NULL,
  'Test cancelled reservation',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- ตรวจสอบ Test Data
SELECT 'Test Inventory Items' AS section, COUNT(*) AS count
FROM public.inventory_items
WHERE id LIKE 'test-%'

UNION ALL

SELECT 'Test Reservations', COUNT(*)
FROM public.stock_reservations
WHERE id LIKE 'test-%'

UNION ALL

SELECT 'Active Reservations', COUNT(*)
FROM public.stock_reservations
WHERE id LIKE 'test-%' AND status = 'active'

UNION ALL

SELECT 'Fulfilled Reservations', COUNT(*)
FROM public.stock_reservations
WHERE id LIKE 'test-%' AND status = 'fulfilled'

UNION ALL

SELECT 'Cancelled Reservations', COUNT(*)
FROM public.stock_reservations
WHERE id LIKE 'test-%' AND status = 'cancelled';

-- ============================================================================
-- CLEANUP (เมื่อเสร็จแล้ว รันคำสั่งนี้เพื่อลบข้อมูลทดสอบ)
-- ============================================================================

-- ⚠️ WARNING: This will delete all test data
-- Uncomment to run cleanup:

-- DELETE FROM public.stock_reservations WHERE id LIKE 'test-%';
-- DELETE FROM public.inventory_items WHERE id LIKE 'test-%';
-- DELETE FROM public.products WHERE id LIKE 'test-%';
-- DELETE FROM public.warehouses WHERE id LIKE 'test-%';
