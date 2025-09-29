-- Enhanced 3-Phase Sales Workflow
-- Migration: เพิ่มการเชื่อมโยง sales_bills และ customer_orders และปรับปรุง workflow
-- Created: 2025-09-28

-- =====================================================
-- ขั้นตอนที่ 1: เพิ่มการเชื่อมโยงระหว่าง sales_bills และ customer_orders
-- =====================================================

-- เพิ่ม column สำหรับเชื่อมโยง sales_bill ใน customer_orders
ALTER TABLE public.customer_orders
ADD COLUMN IF NOT EXISTS sales_bill_id UUID REFERENCES public.sales_bills(id);

-- เพิ่ม index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_customer_orders_sales_bill_id
ON public.customer_orders(sales_bill_id);

-- เพิ่ม column สำหรับ workflow management
ALTER TABLE public.customer_orders
ADD COLUMN IF NOT EXISTS assigned_to_warehouse_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_to_warehouse_by UUID,
ADD COLUMN IF NOT EXISTS warehouse_assignment_notes TEXT;

-- =====================================================
-- ขั้นตอนที่ 2: ปรับปรุงสถานะของ customer_orders ให้รองรับ 3-phase
-- =====================================================

-- ลบ constraint เดิมก่อน
ALTER TABLE public.customer_orders
DROP CONSTRAINT IF EXISTS customer_orders_status_check_new;

-- เพิ่ม constraint ใหม่ที่รองรับสถานะสำหรับ 3-phase workflow
ALTER TABLE public.customer_orders
ADD CONSTRAINT customer_orders_status_check_3phase
CHECK (status IN (
  -- Sales Phase
  'draft', 'pending_approval', 'approved',

  -- Transition Phase
  'ready_for_warehouse', 'sent_to_warehouse', 'assigned_to_warehouse',

  -- Warehouse Phase
  'warehouse_received', 'picking', 'packing', 'ready_to_ship',

  -- Fulfillment Phase
  'shipped', 'in_transit', 'delivered', 'completed',

  -- Terminal States
  'cancelled', 'refunded', 'on_hold',

  -- Legacy support (uppercase)
  'DRAFT', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'
));

-- =====================================================
-- ขั้นตอนที่ 3: เพิ่ม functions สำหรับ workflow management
-- =====================================================

-- Function สำหรับส่งงานจาก Sales ไป Warehouse
CREATE OR REPLACE FUNCTION send_order_to_warehouse(
  p_order_id UUID,
  p_assigned_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_result JSON;
BEGIN
  -- ตรวจสอบว่า order มีอยู่และสถานะถูกต้อง
  SELECT * INTO v_order
  FROM customer_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;

  -- ตรวจสอบสถานะว่าสามารถส่งไป warehouse ได้
  IF v_order.status NOT IN ('approved', 'ready_for_warehouse') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order status must be approved or ready_for_warehouse',
      'current_status', v_order.status
    );
  END IF;

  -- อัปเดตสถานะและข้อมูลการมอบหมาย
  UPDATE customer_orders
  SET
    status = 'sent_to_warehouse',
    assigned_to_warehouse_at = NOW(),
    assigned_to_warehouse_by = p_assigned_by,
    warehouse_assignment_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- บันทึก event log
  INSERT INTO system_events (
    event_type,
    table_name,
    record_id,
    user_id,
    event_data
  ) VALUES (
    'order_sent_to_warehouse',
    'customer_orders',
    p_order_id,
    p_assigned_by,
    json_build_object(
      'order_number', v_order.order_number,
      'previous_status', v_order.status,
      'new_status', 'sent_to_warehouse',
      'notes', p_notes
    )
  );

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'new_status', 'sent_to_warehouse'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function สำหรับ warehouse รับงาน
CREATE OR REPLACE FUNCTION warehouse_accept_order(
  p_order_id UUID,
  p_accepted_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- ตรวจสอบว่า order มีอยู่และสถานะถูกต้อง
  SELECT * INTO v_order
  FROM customer_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;

  -- ตรวจสอบสถานะ
  IF v_order.status != 'sent_to_warehouse' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order must be in sent_to_warehouse status',
      'current_status', v_order.status
    );
  END IF;

  -- อัปเดตสถานะ
  UPDATE customer_orders
  SET
    status = 'warehouse_received',
    updated_at = NOW()
  WHERE id = p_order_id;

  -- บันทึก event log
  INSERT INTO system_events (
    event_type,
    table_name,
    record_id,
    user_id,
    event_data
  ) VALUES (
    'order_accepted_by_warehouse',
    'customer_orders',
    p_order_id,
    p_accepted_by,
    json_build_object(
      'order_number', v_order.order_number,
      'previous_status', v_order.status,
      'new_status', 'warehouse_received',
      'notes', p_notes
    )
  );

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'new_status', 'warehouse_received'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ขั้นตอนที่ 4: สร้าง View สำหรับ Sales และ Warehouse Dashboard
-- =====================================================

-- View สำหรับ Sales Team - ดูสถานะของบิลที่ส่งไป warehouse
CREATE OR REPLACE VIEW sales_orders_status AS
SELECT
  co.id,
  co.order_number,
  co.order_date,
  co.status,
  co.total_amount,
  co.assigned_to_warehouse_at,
  co.assigned_to_warehouse_by,
  co.warehouse_assignment_notes,
  c.customer_name,
  c.customer_code,
  sb.bill_number as sales_bill_number,
  sb.status as sales_bill_status
FROM customer_orders co
LEFT JOIN customers c ON co.customer_id = c.id
LEFT JOIN sales_bills sb ON co.sales_bill_id = sb.id
WHERE co.status IN (
  'approved', 'ready_for_warehouse', 'sent_to_warehouse',
  'assigned_to_warehouse', 'warehouse_received'
)
ORDER BY co.order_date DESC;

-- View สำหรับ Warehouse Team - ดูงานที่ได้รับมอบหมาย
CREATE OR REPLACE VIEW warehouse_pending_orders AS
SELECT
  co.id,
  co.order_number,
  co.order_date,
  co.status,
  co.total_amount,
  co.assigned_to_warehouse_at,
  co.warehouse_assignment_notes,
  c.customer_name,
  c.customer_code,
  c.address_line1,
  c.district,
  c.province,
  -- นับจำนวน items
  COUNT(oi.id) as total_items,
  -- รวมจำนวนสินค้า
  SUM(
    COALESCE(oi.ordered_quantity_level1, 0) +
    COALESCE(oi.ordered_quantity_level2, 0) +
    COALESCE(oi.ordered_quantity_level3, 0)
  ) as total_quantity
FROM customer_orders co
LEFT JOIN customers c ON co.customer_id = c.id
LEFT JOIN order_items oi ON co.id = oi.order_id
WHERE co.status IN ('sent_to_warehouse', 'warehouse_received', 'picking', 'packing')
GROUP BY co.id, c.id
ORDER BY co.assigned_to_warehouse_at ASC;

-- =====================================================
-- ขั้นตอนที่ 5: เพิ่มสิทธิ์การเข้าถึง
-- =====================================================

-- Grant permissions สำหรับ functions
GRANT EXECUTE ON FUNCTION send_order_to_warehouse TO anon, authenticated;
GRANT EXECUTE ON FUNCTION warehouse_accept_order TO anon, authenticated;

-- Grant permissions สำหรับ views
GRANT SELECT ON sales_orders_status TO anon, authenticated;
GRANT SELECT ON warehouse_pending_orders TO anon, authenticated;

-- =====================================================
-- ขั้นตอนที่ 6: สร้าง sample data สำหรับทดสอบ (Optional)
-- =====================================================

-- เพิ่ม sample customers หากยังไม่มี
INSERT INTO customers (
  customer_name, customer_code, customer_type,
  contact_person, phone, email,
  address_line1, district, province, postal_code
) VALUES
(
  'บริษัท ทดสอบ จำกัด', 'TEST001', 'BUSINESS',
  'คุณทดสอบ', '02-123-4567', 'test@example.com',
  '123 ถนนทดสอบ', 'วังทองหลาง', 'กรุงเทพฯ', '10310'
)
ON CONFLICT (customer_code) DO NOTHING;

COMMENT ON FUNCTION send_order_to_warehouse IS 'ส่งงานจากฝ่ายขายไปยังคลังสินค้า';
COMMENT ON FUNCTION warehouse_accept_order IS 'คลังสินค้ารับงานจากฝ่ายขาย';
COMMENT ON VIEW sales_orders_status IS 'สถานะคำสั่งซื้อสำหรับฝ่ายขาย';
COMMENT ON VIEW warehouse_pending_orders IS 'งานที่รอดำเนินการสำหรับคลังสินค้า';