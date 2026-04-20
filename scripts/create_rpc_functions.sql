-- ============================================================================
-- RPC Functions for Local PostgreSQL
-- สร้าง functions ที่ frontend เรียกผ่าน localDb.rpc()
-- Adapted from Supabase migrations for standalone PostgreSQL
-- ============================================================================

-- 1. BULK TRANSFER INVENTORY
-- ย้ายสินค้าหลายรายการพร้อมกัน (1:N Transfer)
-- Source: supabase/migrations/20251028_bulk_transfer_function.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_transfer_inventory(transfers_json TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, transferred_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  transfer_record RECORD;
  transfers JSONB;
  source_item_id UUID;
  dest_item_id UUID;
  transfer_quantity INTEGER;
  current_source_qty INTEGER;
  success_count INTEGER := 0;
  movement_id UUID;
BEGIN
  transfers := transfers_json::JSONB;

  FOR transfer_record IN
    SELECT
      (item->>'product_id')::UUID as product_id,
      item->>'from_location' as from_location,
      item->>'to_location' as to_location,
      (item->>'quantity_pieces')::INTEGER as quantity_pieces
    FROM jsonb_array_elements(transfers) as item
  LOOP
    IF transfer_record.quantity_pieces <= 0 THEN
      RAISE EXCEPTION 'จำนวนต้องมากกว่า 0 สำหรับสินค้า %', transfer_record.product_id;
    END IF;

    IF transfer_record.from_location = transfer_record.to_location THEN
      RAISE EXCEPTION 'ไม่สามารถย้ายไปโลเคชั่นเดียวกันได้';
    END IF;

    SELECT id, quantity_pieces INTO source_item_id, current_source_qty
    FROM inventory_items
    WHERE id = transfer_record.product_id
      AND location = transfer_record.from_location
    FOR UPDATE;

    IF source_item_id IS NULL THEN
      RAISE EXCEPTION 'ไม่พบสินค้าในโลเคชั่นต้นทาง % สำหรับสินค้า %',
        transfer_record.from_location, transfer_record.product_id;
    END IF;

    IF current_source_qty < transfer_record.quantity_pieces THEN
      RAISE EXCEPTION 'สินค้าในโลเคชั่น % ไม่เพียงพอ (มี % ต้องการ %)',
        transfer_record.from_location, current_source_qty, transfer_record.quantity_pieces;
    END IF;

    UPDATE inventory_items
    SET quantity_pieces = quantity_pieces - transfer_record.quantity_pieces, updated_at = NOW()
    WHERE id = source_item_id;

    SELECT id INTO dest_item_id
    FROM inventory_items
    WHERE sku = (SELECT sku FROM inventory_items WHERE id = source_item_id)
      AND location = transfer_record.to_location
    FOR UPDATE;

    IF dest_item_id IS NULL THEN
      INSERT INTO inventory_items (
        sku, product_name, location, quantity_pieces, created_at, updated_at
      )
      SELECT sku, product_name, transfer_record.to_location, transfer_record.quantity_pieces, NOW(), NOW()
      FROM inventory_items WHERE id = source_item_id
      RETURNING id INTO dest_item_id;
    ELSE
      UPDATE inventory_items
      SET quantity_pieces = quantity_pieces + transfer_record.quantity_pieces, updated_at = NOW()
      WHERE id = dest_item_id;
    END IF;

    INSERT INTO inventory_movements (
      inventory_item_id, movement_type, quantity, reason,
      location_from, location_to, created_at
    ) VALUES (
      source_item_id, 'transfer', transfer_record.quantity_pieces,
      'Bulk transfer: ' || transfer_record.from_location || ' → ' || transfer_record.to_location,
      transfer_record.from_location, transfer_record.to_location, NOW()
    ) RETURNING id INTO movement_id;

    INSERT INTO system_events (
      event_type, event_category, event_title, event_description, severity_level, metadata, created_at
    ) VALUES (
      'inventory_transfer', 'inventory', 'Bulk Transfer',
      format('Bulk transfer: %s pieces from %s to %s',
        transfer_record.quantity_pieces, transfer_record.from_location, transfer_record.to_location),
      'info',
      jsonb_build_object(
        'movement_id', movement_id,
        'from_location', transfer_record.from_location,
        'to_location', transfer_record.to_location,
        'quantity', transfer_record.quantity_pieces
      ),
      NOW()
    );

    success_count := success_count + 1;
  END LOOP;

  RETURN QUERY SELECT
    TRUE::BOOLEAN as success,
    format('%s รายการย้ายสำเร็จ', success_count) as message,
    success_count as transferred_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Bulk transfer failed: %', SQLERRM;
END;
$$;

-- ============================================================================
-- 2. RESERVE STOCK SAFE
-- จองสต็อก - ตรวจ available, สร้าง reservation, update reserved quantities
-- Source: supabase/migrations/20251012_add_reserved_stock_system_FIXED.sql
-- ============================================================================

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
  SELECT (COALESCE(total_base_quantity, 0) - COALESCE(reserved_quantity, 0)) INTO v_available_qty
  FROM inventory_items
  WHERE id = p_inventory_item_id
  FOR UPDATE;

  IF v_available_qty IS NULL THEN
    RAISE EXCEPTION 'ไม่พบรายการสต็อก';
  END IF;

  IF v_available_qty < p_total_qty THEN
    RAISE EXCEPTION 'สต็อกไม่เพียงพอ (มี % ต้องการ %)', v_available_qty, p_total_qty;
  END IF;

  INSERT INTO stock_reservations (
    inventory_item_id, fulfillment_item_id, warehouse_code, location,
    reserved_level1_quantity, reserved_level2_quantity, reserved_level3_quantity,
    reserved_total_quantity, reserved_by, notes, status
  ) VALUES (
    p_inventory_item_id, p_fulfillment_item_id, p_warehouse_code, p_location,
    p_level1_qty, p_level2_qty, p_level3_qty, p_total_qty,
    p_reserved_by, p_notes, 'active'
  ) RETURNING id INTO v_reservation_id;

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

-- ============================================================================
-- 3. CANCEL RESERVATION
-- ยกเลิกการจอง - คืน reserved quantities กลับไป
-- ============================================================================

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

  UPDATE inventory_items
  SET
    reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - v_reservation.reserved_total_quantity, 0),
    reserved_level1_quantity = GREATEST(COALESCE(reserved_level1_quantity, 0) - v_reservation.reserved_level1_quantity, 0),
    reserved_level2_quantity = GREATEST(COALESCE(reserved_level2_quantity, 0) - v_reservation.reserved_level2_quantity, 0),
    reserved_level3_quantity = GREATEST(COALESCE(reserved_level3_quantity, 0) - v_reservation.reserved_level3_quantity, 0),
    updated_at = NOW()
  WHERE id = v_reservation.inventory_item_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. FULFILL RESERVATION
-- ตัดจอง - หักสต็อกจริง + ลด reserved quantities
-- ============================================================================

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

  UPDATE inventory_items
  SET
    total_base_quantity = GREATEST(COALESCE(total_base_quantity, 0) - v_reservation.reserved_total_quantity, 0),
    reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - v_reservation.reserved_total_quantity, 0),
    unit_level1_quantity = GREATEST(COALESCE(unit_level1_quantity, 0) - v_reservation.reserved_level1_quantity, 0),
    reserved_level1_quantity = GREATEST(COALESCE(reserved_level1_quantity, 0) - v_reservation.reserved_level1_quantity, 0),
    unit_level2_quantity = GREATEST(COALESCE(unit_level2_quantity, 0) - v_reservation.reserved_level2_quantity, 0),
    reserved_level2_quantity = GREATEST(COALESCE(reserved_level2_quantity, 0) - v_reservation.reserved_level2_quantity, 0),
    unit_level3_quantity = GREATEST(COALESCE(unit_level3_quantity, 0) - v_reservation.reserved_level3_quantity, 0),
    reserved_level3_quantity = GREATEST(COALESCE(reserved_level3_quantity, 0) - v_reservation.reserved_level3_quantity, 0),
    updated_at = NOW()
  WHERE id = v_reservation.inventory_item_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ All 4 RPC functions created successfully';
END $$;
