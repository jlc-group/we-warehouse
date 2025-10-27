-- ===============================================
-- Bulk Transfer Inventory Function
-- ย้ายสินค้าหลายรายการพร้อมกัน (1:N Transfer)
-- ===============================================

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
  -- Parse JSON input
  transfers := transfers_json::JSONB;

  -- Loop through each transfer request
  FOR transfer_record IN
    SELECT
      (item->>'product_id')::UUID as product_id,
      item->>'from_location' as from_location,
      item->>'to_location' as to_location,
      (item->>'quantity_pieces')::INTEGER as quantity_pieces
    FROM jsonb_array_elements(transfers) as item
  LOOP
    -- Validate quantity
    IF transfer_record.quantity_pieces <= 0 THEN
      RAISE EXCEPTION 'จำนวนต้องมากกว่า 0 สำหรับสินค้า %', transfer_record.product_id;
    END IF;

    -- Validate locations are different
    IF transfer_record.from_location = transfer_record.to_location THEN
      RAISE EXCEPTION 'ไม่สามารถย้ายไปโลเคชั่นเดียวกันได้';
    END IF;

    -- Get source inventory item
    SELECT id, quantity_pieces INTO source_item_id, current_source_qty
    FROM inventory_items
    WHERE product_id = transfer_record.product_id
      AND location = transfer_record.from_location
    FOR UPDATE;

    IF source_item_id IS NULL THEN
      RAISE EXCEPTION 'ไม่พบสินค้าในโลเคชั่นต้นทาง % สำหรับสินค้า %',
        transfer_record.from_location, transfer_record.product_id;
    END IF;

    -- Check sufficient quantity
    IF current_source_qty < transfer_record.quantity_pieces THEN
      RAISE EXCEPTION 'สินค้าในโลเคชั่น % ไม่เพียงพอ (มี % ต้องการ %)',
        transfer_record.from_location, current_source_qty, transfer_record.quantity_pieces;
    END IF;

    -- Deduct from source location
    UPDATE inventory_items
    SET
      quantity_pieces = quantity_pieces - transfer_record.quantity_pieces,
      updated_at = NOW()
    WHERE id = source_item_id;

    -- Find or create destination inventory item
    SELECT id INTO dest_item_id
    FROM inventory_items
    WHERE product_id = transfer_record.product_id
      AND location = transfer_record.to_location
    FOR UPDATE;

    IF dest_item_id IS NULL THEN
      -- Create new destination item
      INSERT INTO inventory_items (
        product_id,
        location,
        quantity_pieces,
        quantity_cartons,
        quantity_boxes,
        created_at,
        updated_at
      ) VALUES (
        transfer_record.product_id,
        transfer_record.to_location,
        transfer_record.quantity_pieces,
        0,
        0,
        NOW(),
        NOW()
      )
      RETURNING id INTO dest_item_id;
    ELSE
      -- Add to existing destination item
      UPDATE inventory_items
      SET
        quantity_pieces = quantity_pieces + transfer_record.quantity_pieces,
        updated_at = NOW()
      WHERE id = dest_item_id;
    END IF;

    -- Create movement record
    INSERT INTO inventory_movements (
      inventory_item_id,
      product_id,
      movement_type,
      quantity_change_pieces,
      quantity_change_boxes,
      quantity_change_cartons,
      reason,
      from_location,
      to_location,
      created_at
    ) VALUES (
      source_item_id,
      transfer_record.product_id,
      'transfer',
      transfer_record.quantity_pieces,
      0,
      0,
      'Bulk transfer: ' || transfer_record.from_location || ' → ' || transfer_record.to_location,
      transfer_record.from_location,
      transfer_record.to_location,
      NOW()
    ) RETURNING id INTO movement_id;

    -- Log event
    INSERT INTO system_events (
      event_type,
      description,
      metadata,
      created_at
    ) VALUES (
      'inventory_transfer',
      format('Bulk transfer: %s pieces from %s to %s',
        transfer_record.quantity_pieces,
        transfer_record.from_location,
        transfer_record.to_location
      ),
      jsonb_build_object(
        'movement_id', movement_id,
        'product_id', transfer_record.product_id,
        'from_location', transfer_record.from_location,
        'to_location', transfer_record.to_location,
        'quantity', transfer_record.quantity_pieces,
        'transfer_type', 'bulk'
      ),
      NOW()
    );

    success_count := success_count + 1;
  END LOOP;

  -- Return success summary
  RETURN QUERY SELECT
    TRUE::BOOLEAN as success,
    format('%s รายการย้ายสำเร็จ', success_count) as message,
    success_count as transferred_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Bulk transfer failed: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION bulk_transfer_inventory(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_transfer_inventory(TEXT) TO anon;

COMMENT ON FUNCTION bulk_transfer_inventory IS 'ย้ายสินค้าหลายรายการพร้อมกัน (1:N Transfer) - รองรับการย้ายจากโลเคชั่นเดียวไปหลายโลเคชั่น';
