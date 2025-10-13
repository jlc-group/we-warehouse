-- ============================================================================
-- RESERVED STOCK SYSTEM - FIXED VERSION
-- Migration: 20251012_add_reserved_stock_system_FIXED
-- Description: เพิ่มระบบจองสต็อก (Reserved Stock) ตาม schema จริง
-- Fixed: ใช้ total_base_quantity แทน quantity
-- ============================================================================

-- ============================================================================
-- PART 1: เพิ่มคอลัมน์ Reserved ใน inventory_items (ถ้ายังไม่มี)
-- ============================================================================

DO $$
BEGIN
  -- เพิ่ม reserved_quantity (base unit) ถ้ายังไม่มี
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_items'
      AND column_name = 'reserved_quantity'
  ) THEN
    ALTER TABLE public.inventory_items
    ADD COLUMN reserved_quantity INTEGER DEFAULT 0 CHECK (reserved_quantity >= 0);

    COMMENT ON COLUMN public.inventory_items.reserved_quantity
    IS 'จำนวนสต็อกที่ถูกจอง (base unit) - ยังไม่ได้หักออกจาก total_base_quantity';
  END IF;
END $$;

-- หมายเหตุ: reserved_level1/2/3_quantity และ warehouse_id มีอยู่แล้ว ไม่ต้องเพิ่ม

-- เพิ่ม Constraint: reserved ต้องไม่เกิน total_base_quantity
ALTER TABLE public.inventory_items
DROP CONSTRAINT IF EXISTS check_reserved_not_exceed_total;

ALTER TABLE public.inventory_items
ADD CONSTRAINT check_reserved_not_exceed_total
CHECK (COALESCE(reserved_quantity, 0) <= COALESCE(total_base_quantity, 0));

COMMENT ON CONSTRAINT check_reserved_not_exceed_total
ON public.inventory_items
IS 'ป้องกันการจองเกินกว่าสต็อกที่มี';

-- ============================================================================
-- PART 2: สร้างตาราง stock_reservations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference keys
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  fulfillment_item_id UUID REFERENCES public.fulfillment_items(id) ON DELETE CASCADE,
  warehouse_code VARCHAR(10) NOT NULL,
  location TEXT NOT NULL,

  -- จำนวนจอง (multi-level units)
  reserved_level1_quantity INTEGER DEFAULT 0 CHECK (reserved_level1_quantity >= 0),
  reserved_level2_quantity INTEGER DEFAULT 0 CHECK (reserved_level2_quantity >= 0),
  reserved_level3_quantity INTEGER DEFAULT 0 CHECK (reserved_level3_quantity >= 0),
  reserved_total_quantity INTEGER NOT NULL CHECK (reserved_total_quantity >= 0),

  -- Unit names (for display)
  unit_level1_name TEXT DEFAULT 'ลัง',
  unit_level2_name TEXT DEFAULT 'กล่อง',
  unit_level3_name TEXT DEFAULT 'ชิ้น',

  -- Status tracking
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
  reservation_type VARCHAR(20) DEFAULT 'fulfillment' CHECK (reservation_type IN ('fulfillment', 'transfer', 'adjustment')),

  -- Timestamps & Audit
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reserved_by UUID REFERENCES public.users(id),
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID REFERENCES public.users(id),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.users(id),

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_inventory
ON public.stock_reservations(inventory_item_id)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_reservations_fulfillment
ON public.stock_reservations(fulfillment_item_id);

CREATE INDEX IF NOT EXISTS idx_reservations_status
ON public.stock_reservations(status);

CREATE INDEX IF NOT EXISTS idx_reservations_warehouse
ON public.stock_reservations(warehouse_code);

CREATE INDEX IF NOT EXISTS idx_reservations_location
ON public.stock_reservations(location);

CREATE INDEX IF NOT EXISTS idx_reservations_reserved_at
ON public.stock_reservations(reserved_at DESC);

-- Enable RLS
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now)
DROP POLICY IF EXISTS "Allow all access to stock_reservations" ON public.stock_reservations;
CREATE POLICY "Allow all access to stock_reservations"
ON public.stock_reservations FOR ALL USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_stock_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stock_reservations_updated_at ON public.stock_reservations;
CREATE TRIGGER update_stock_reservations_updated_at
    BEFORE UPDATE ON public.stock_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_reservations_updated_at();

-- Table comments
COMMENT ON TABLE public.stock_reservations
IS 'ตารางเก็บรายการจองสต็อก - รองรับ multi-level units และ multi-warehouse';

-- ============================================================================
-- PART 3: สร้าง View inventory_available (ใช้ total_base_quantity)
-- ============================================================================

DROP VIEW IF EXISTS public.inventory_available CASCADE;

CREATE VIEW public.inventory_available AS
SELECT
  i.id,
  i.product_name,
  i.sku,
  i.location,
  i.lot,
  i.mfd,

  -- Quantities (all levels) - ใช้ total_base_quantity แทน quantity
  i.total_base_quantity AS quantity,
  COALESCE(i.reserved_quantity, 0) AS reserved_quantity,
  (i.total_base_quantity - COALESCE(i.reserved_quantity, 0)) AS available_quantity,

  -- Level 1 (ลัง)
  i.unit_level1_quantity,
  COALESCE(i.reserved_level1_quantity, 0) AS reserved_level1_quantity,
  (i.unit_level1_quantity - COALESCE(i.reserved_level1_quantity, 0)) AS available_level1_quantity,
  i.unit_level1_name,
  i.unit_level1_rate,

  -- Level 2 (กล่อง)
  i.unit_level2_quantity,
  COALESCE(i.reserved_level2_quantity, 0) AS reserved_level2_quantity,
  (i.unit_level2_quantity - COALESCE(i.reserved_level2_quantity, 0)) AS available_level2_quantity,
  i.unit_level2_name,
  i.unit_level2_rate,

  -- Level 3 (ชิ้น)
  i.unit_level3_quantity,
  COALESCE(i.reserved_level3_quantity, 0) AS reserved_level3_quantity,
  (i.unit_level3_quantity - COALESCE(i.reserved_level3_quantity, 0)) AS available_level3_quantity,
  i.unit_level3_name,

  -- Warehouse info
  i.warehouse_id,
  w.code AS warehouse_code,
  w.name AS warehouse_name,

  -- Reservation summary
  COALESCE(r.total_reserved, 0) AS total_reservations,
  COALESCE(r.active_reservations, 0) AS active_reservation_count,

  -- Status flags
  i.is_deleted,
  CASE
    WHEN (i.total_base_quantity - COALESCE(i.reserved_quantity, 0)) <= 0 THEN true
    ELSE false
  END AS is_out_of_stock,
  CASE
    WHEN (i.total_base_quantity - COALESCE(i.reserved_quantity, 0)) > 0
      AND (i.total_base_quantity - COALESCE(i.reserved_quantity, 0)) < 10 THEN true
    ELSE false
  END AS is_low_stock,

  -- Metadata
  i.user_id,
  i.created_at,
  i.updated_at

FROM public.inventory_items i
LEFT JOIN public.warehouses w ON i.warehouse_id = w.id
LEFT JOIN (
  SELECT
    inventory_item_id,
    COUNT(*) FILTER (WHERE status = 'active') AS active_reservations,
    SUM(reserved_total_quantity) FILTER (WHERE status = 'active') AS total_reserved
  FROM public.stock_reservations
  GROUP BY inventory_item_id
) r ON i.id = r.inventory_item_id
WHERE i.is_deleted = FALSE OR i.is_deleted IS NULL;

COMMENT ON VIEW public.inventory_available
IS 'View แสดงสต็อกพร้อมใช้งาน (Available = Total - Reserved)';

-- ============================================================================
-- PART 4: Views เพิ่มเติม
-- ============================================================================

-- 4.1 Reservation Summary by Warehouse
DROP VIEW IF EXISTS public.reservation_summary_by_warehouse CASCADE;

CREATE VIEW public.reservation_summary_by_warehouse AS
SELECT
  sr.warehouse_code,
  w.name AS warehouse_name,
  COUNT(*) FILTER (WHERE sr.status = 'active') AS active_reservation_count,
  SUM(sr.reserved_total_quantity) FILTER (WHERE sr.status = 'active') AS total_reserved_quantity
FROM public.stock_reservations sr
LEFT JOIN public.warehouses w ON sr.warehouse_code = w.code
GROUP BY sr.warehouse_code, w.name;

-- 4.2 Reservation History
DROP VIEW IF EXISTS public.reservation_history CASCADE;

CREATE VIEW public.reservation_history AS
SELECT
  sr.id,
  sr.inventory_item_id,
  sr.fulfillment_item_id,
  sr.warehouse_code,
  sr.location,

  -- Product info
  i.product_name,
  i.sku,

  -- Reservation details
  sr.reserved_total_quantity,
  sr.status,

  -- Timestamps
  sr.reserved_at,
  sr.fulfilled_at,
  sr.cancelled_at,
  sr.notes

FROM public.stock_reservations sr
JOIN public.inventory_items i ON sr.inventory_item_id = i.id
ORDER BY sr.reserved_at DESC;

-- ============================================================================
-- PART 5: Functions (ใช้ total_base_quantity)
-- ============================================================================

-- 5.1 Reserve Stock
CREATE OR REPLACE FUNCTION reserve_stock_safe(
  p_inventory_item_id UUID,
  p_fulfillment_item_id UUID,
  p_warehouse_code VARCHAR(10),
  p_location TEXT,
  p_level1_qty INTEGER,
  p_level2_qty INTEGER,
  p_level3_qty INTEGER,
  p_total_qty INTEGER,
  p_reserved_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_available_qty INTEGER;
  v_reservation_id UUID;
BEGIN
  -- Check available stock (ใช้ total_base_quantity)
  SELECT (total_base_quantity - COALESCE(reserved_quantity, 0)) INTO v_available_qty
  FROM inventory_items
  WHERE id = p_inventory_item_id
  FOR UPDATE;

  IF v_available_qty < p_total_qty THEN
    RAISE EXCEPTION 'สต็อกไม่เพียงพอ (มี % ต้องการ %)', v_available_qty, p_total_qty;
  END IF;

  -- Create reservation
  INSERT INTO stock_reservations (
    inventory_item_id, fulfillment_item_id, warehouse_code, location,
    reserved_level1_quantity, reserved_level2_quantity, reserved_level3_quantity,
    reserved_total_quantity, reserved_by, notes, status
  ) VALUES (
    p_inventory_item_id, p_fulfillment_item_id, p_warehouse_code, p_location,
    p_level1_qty, p_level2_qty, p_level3_qty, p_total_qty,
    p_reserved_by, p_notes, 'active'
  ) RETURNING id INTO v_reservation_id;

  -- Update reserved quantities
  UPDATE inventory_items
  SET
    reserved_quantity = COALESCE(reserved_quantity, 0) + p_total_qty,
    reserved_level1_quantity = COALESCE(reserved_level1_quantity, 0) + p_level1_qty,
    reserved_level2_quantity = COALESCE(reserved_level2_quantity, 0) + p_level2_qty,
    reserved_level3_quantity = COALESCE(reserved_level3_quantity, 0) + p_level3_qty,
    updated_at = NOW()
  WHERE id = p_inventory_item_id;

  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Cancel Reservation
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_reservation_id UUID,
  p_cancelled_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  SELECT * INTO v_reservation
  FROM stock_reservations
  WHERE id = p_reservation_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบการจองหรือถูกยกเลิกแล้ว';
  END IF;

  UPDATE stock_reservations
  SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = p_cancelled_by, updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Return stock
  UPDATE inventory_items
  SET
    reserved_quantity = COALESCE(reserved_quantity, 0) - v_reservation.reserved_total_quantity,
    reserved_level1_quantity = COALESCE(reserved_level1_quantity, 0) - v_reservation.reserved_level1_quantity,
    reserved_level2_quantity = COALESCE(reserved_level2_quantity, 0) - v_reservation.reserved_level2_quantity,
    reserved_level3_quantity = COALESCE(reserved_level3_quantity, 0) - v_reservation.reserved_level3_quantity,
    updated_at = NOW()
  WHERE id = v_reservation.inventory_item_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5.3 Fulfill Reservation (หักสต็อกจริง)
CREATE OR REPLACE FUNCTION fulfill_reservation(
  p_reservation_id UUID,
  p_fulfilled_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  SELECT * INTO v_reservation
  FROM stock_reservations
  WHERE id = p_reservation_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบการจองที่ active';
  END IF;

  UPDATE stock_reservations
  SET status = 'fulfilled', fulfilled_at = NOW(), fulfilled_by = p_fulfilled_by, updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Deduct from actual stock (ลด total_base_quantity และ reserved)
  UPDATE inventory_items
  SET
    total_base_quantity = total_base_quantity - v_reservation.reserved_total_quantity,
    reserved_quantity = COALESCE(reserved_quantity, 0) - v_reservation.reserved_total_quantity,
    unit_level1_quantity = unit_level1_quantity - v_reservation.reserved_level1_quantity,
    reserved_level1_quantity = COALESCE(reserved_level1_quantity, 0) - v_reservation.reserved_level1_quantity,
    unit_level2_quantity = unit_level2_quantity - v_reservation.reserved_level2_quantity,
    reserved_level2_quantity = COALESCE(reserved_level2_quantity, 0) - v_reservation.reserved_level2_quantity,
    unit_level3_quantity = unit_level3_quantity - v_reservation.reserved_level3_quantity,
    reserved_level3_quantity = COALESCE(reserved_level3_quantity, 0) - v_reservation.reserved_level3_quantity,
    updated_at = NOW()
  WHERE id = v_reservation.inventory_item_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: Permissions
-- ============================================================================

GRANT ALL ON public.stock_reservations TO anon, authenticated;
GRANT ALL ON public.inventory_available TO anon, authenticated;
GRANT ALL ON public.reservation_summary_by_warehouse TO anon, authenticated;
GRANT ALL ON public.reservation_history TO anon, authenticated;

GRANT EXECUTE ON FUNCTION reserve_stock_safe TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_reservation TO anon, authenticated;
GRANT EXECUTE ON FUNCTION fulfill_reservation TO anon, authenticated;

-- ============================================================================
-- SUCCESS!
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Reserved Stock System Installed Successfully';
END $$;
