-- Enhanced Event Logging System (Fixed & Idempotent)
-- This migration creates a comprehensive event logging system for the warehouse management app
-- This version can be run multiple times safely (idempotent)
--
-- INSTRUCTIONS:
-- 1. Copy this entire SQL script
-- 2. Paste it into Supabase SQL Editor
-- 3. Click "Run" to execute
-- 4. Check for any errors in the output
--
-- If you get "already exists" errors, that's expected and safe to ignore
-- The migration will skip existing objects and only create new ones

-- 1. Create comprehensive event log table
CREATE TABLE IF NOT EXISTS public.system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event classification
  event_type VARCHAR(50) NOT NULL, -- 'inventory', 'user_action', 'system', 'error', 'business_process'
  event_category VARCHAR(50) NOT NULL, -- 'stock_movement', 'location_change', 'order_processing', etc.
  event_action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'transfer', 'scan_qr', etc.

  -- Event details
  event_title TEXT NOT NULL,
  event_description TEXT,

  -- Related entities (flexible JSON for any references)
  entity_type VARCHAR(50), -- 'inventory_item', 'location', 'order', 'product', etc.
  entity_id UUID,
  related_entities JSONB DEFAULT '{}', -- For multiple related entities

  -- Event data payload (flexible storage)
  event_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Change tracking (for audit trail)
  changes_before JSONB,
  changes_after JSONB,

  -- User and session info
  user_id UUID,
  user_agent TEXT,
  ip_address INET,
  session_id VARCHAR(255),

  -- Status and severity
  status VARCHAR(20) DEFAULT 'success', -- 'success', 'warning', 'error', 'info'
  severity VARCHAR(20) DEFAULT 'info', -- 'critical', 'high', 'medium', 'low', 'info'

  -- Location context (warehouse context)
  warehouse_id UUID,
  location_context TEXT, -- The location where event occurred

  -- Processing info
  processing_time_ms INTEGER,
  api_endpoint TEXT,
  http_method VARCHAR(10),
  response_status INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_system_events_type_category ON public.system_events(event_type, event_category);
CREATE INDEX IF NOT EXISTS idx_system_events_entity ON public.system_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_system_events_user ON public.system_events(user_id);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_status ON public.system_events(status);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON public.system_events(severity);
CREATE INDEX IF NOT EXISTS idx_system_events_warehouse ON public.system_events(warehouse_id);

-- Create composite indexes for common query patterns (idempotent)
CREATE INDEX IF NOT EXISTS idx_system_events_status_created ON public.system_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_type_created ON public.system_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_severity_created ON public.system_events(severity, created_at DESC);

-- 3. Create specialized views for common queries
CREATE OR REPLACE VIEW public.recent_events AS
SELECT
  id,
  event_type,
  event_category,
  event_action,
  event_title,
  event_description,
  entity_type,
  entity_id,
  status,
  severity,
  user_id,
  warehouse_id,
  location_context,
  created_at
FROM public.system_events
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.error_events AS
SELECT
  id,
  event_title,
  event_description,
  event_data,
  severity,
  entity_type,
  entity_id,
  user_id,
  api_endpoint,
  response_status,
  created_at
FROM public.system_events
WHERE status = 'error'
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.inventory_events AS
SELECT
  se.id,
  se.event_action,
  se.event_title,
  se.event_description,
  se.changes_before,
  se.changes_after,
  se.location_context,
  se.user_id,
  se.created_at,
  -- Join with inventory items for context
  ii.product_name,
  ii.sku,
  ii.location as current_location
FROM public.system_events se
LEFT JOIN public.inventory_items ii ON se.entity_id = ii.id
WHERE se.event_type = 'inventory'
ORDER BY se.created_at DESC;

-- 4. Create enhanced inventory movement logging
CREATE OR REPLACE FUNCTION public.log_enhanced_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
  movement_type_val TEXT := 'adjustment';
  event_title_val TEXT := 'การเปลี่ยนแปลงสต็อก';
  event_description_val TEXT := 'มีการเปลี่ยนแปลงข้อมูลสต็อก';
  changes_before_val JSONB;
  changes_after_val JSONB;
BEGIN
  -- Prepare change data for NEW operations
  IF NEW IS NOT NULL THEN
    changes_after_val := jsonb_build_object(
      'unit_level1_quantity', COALESCE(NEW.unit_level1_quantity, NEW.carton_quantity_legacy, 0),
      'unit_level2_quantity', COALESCE(NEW.unit_level2_quantity, NEW.box_quantity_legacy, 0),
      'unit_level3_quantity', COALESCE(NEW.unit_level3_quantity, 0),
      'location', NEW.location,
      'product_name', NEW.product_name,
      'sku', NEW.sku,
      'lot', NEW.lot,
      'mfd', NEW.mfd
    );
  END IF;

  -- Prepare change data for OLD operations
  IF OLD IS NOT NULL THEN
    changes_before_val := jsonb_build_object(
      'unit_level1_quantity', COALESCE(OLD.unit_level1_quantity, OLD.carton_quantity_legacy, 0),
      'unit_level2_quantity', COALESCE(OLD.unit_level2_quantity, OLD.box_quantity_legacy, 0),
      'unit_level3_quantity', COALESCE(OLD.unit_level3_quantity, 0),
      'location', OLD.location,
      'product_name', OLD.product_name,
      'sku', OLD.sku,
      'lot', OLD.lot,
      'mfd', OLD.mfd
    );
  END IF;

  -- Handle different trigger operations
  IF TG_OP = 'INSERT' THEN
    movement_type_val := 'in';
    event_title_val := 'เพิ่มสินค้าใหม่';
    event_description_val := 'เพิ่มสินค้า ' || NEW.product_name || ' ในตำแหน่ง ' || NEW.location;

    -- Log to system_events
    INSERT INTO public.system_events (
      event_type, event_category, event_action,
      event_title, event_description,
      entity_type, entity_id,
      changes_after,
      user_id,
      warehouse_id,
      location_context,
      event_data
    ) VALUES (
      'inventory', 'stock_movement', 'create',
      event_title_val, event_description_val,
      'inventory_item', NEW.id,
      changes_after_val,
      NEW.user_id,
      NEW.warehouse_id,
      NEW.location,
      jsonb_build_object(
        'total_quantity_added', COALESCE(NEW.unit_level1_quantity, 0) + COALESCE(NEW.unit_level2_quantity, 0) + COALESCE(NEW.unit_level3_quantity, 0)
      )
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- Determine movement type and description
    IF OLD.location != NEW.location THEN
      movement_type_val := 'transfer';
      event_title_val := 'ย้ายสินค้า';
      event_description_val := 'ย้าย ' || NEW.product_name || ' จาก ' || OLD.location || ' ไป ' || NEW.location;
    ELSIF (COALESCE(NEW.unit_level1_quantity, 0) + COALESCE(NEW.unit_level2_quantity, 0) + COALESCE(NEW.unit_level3_quantity, 0)) >
          (COALESCE(OLD.unit_level1_quantity, 0) + COALESCE(OLD.unit_level2_quantity, 0) + COALESCE(OLD.unit_level3_quantity, 0)) THEN
      movement_type_val := 'in';
      event_title_val := 'เพิ่มสต็อก';
      event_description_val := 'เพิ่มสต็อก ' || NEW.product_name || ' ในตำแหน่ง ' || NEW.location;
    ELSIF (COALESCE(NEW.unit_level1_quantity, 0) + COALESCE(NEW.unit_level2_quantity, 0) + COALESCE(NEW.unit_level3_quantity, 0)) <
          (COALESCE(OLD.unit_level1_quantity, 0) + COALESCE(OLD.unit_level2_quantity, 0) + COALESCE(OLD.unit_level3_quantity, 0)) THEN
      movement_type_val := 'out';
      event_title_val := 'ลดสต็อก';
      event_description_val := 'ลดสต็อก ' || NEW.product_name || ' ในตำแหน่ง ' || NEW.location;
    ELSE
      movement_type_val := 'adjustment';
      event_title_val := 'ปรับปรุงข้อมูล';
      event_description_val := 'ปรับปรุงข้อมูล ' || NEW.product_name;
    END IF;

    -- Log to system_events
    INSERT INTO public.system_events (
      event_type, event_category, event_action,
      event_title, event_description,
      entity_type, entity_id,
      changes_before, changes_after,
      user_id,
      warehouse_id,
      location_context,
      event_data
    ) VALUES (
      'inventory', 'stock_movement', movement_type_val,
      event_title_val, event_description_val,
      'inventory_item', NEW.id,
      changes_before_val, changes_after_val,
      COALESCE(NEW.user_id, OLD.user_id),
      COALESCE(NEW.warehouse_id, OLD.warehouse_id),
      COALESCE(NEW.location, OLD.location),
      jsonb_build_object(
        'quantity_change', (COALESCE(NEW.unit_level1_quantity, 0) + COALESCE(NEW.unit_level2_quantity, 0) + COALESCE(NEW.unit_level3_quantity, 0)) -
                          (COALESCE(OLD.unit_level1_quantity, 0) + COALESCE(OLD.unit_level2_quantity, 0) + COALESCE(OLD.unit_level3_quantity, 0)),
        'location_changed', OLD.location != NEW.location
      )
    );

  ELSIF TG_OP = 'DELETE' THEN
    movement_type_val := 'out';
    event_title_val := 'ลบสินค้า';
    event_description_val := 'ลบสินค้า ' || OLD.product_name || ' ออกจากตำแหน่ง ' || OLD.location;

    -- Log to system_events
    INSERT INTO public.system_events (
      event_type, event_category, event_action,
      event_title, event_description,
      entity_type, entity_id,
      changes_before,
      user_id,
      warehouse_id,
      location_context,
      event_data
    ) VALUES (
      'inventory', 'stock_movement', 'delete',
      event_title_val, event_description_val,
      'inventory_item', OLD.id,
      changes_before_val,
      OLD.user_id,
      OLD.warehouse_id,
      OLD.location,
      jsonb_build_object(
        'total_quantity_removed', COALESCE(OLD.unit_level1_quantity, 0) + COALESCE(OLD.unit_level2_quantity, 0) + COALESCE(OLD.unit_level3_quantity, 0)
      )
    );
  END IF;

  -- Also log to the original inventory_movements table for backward compatibility
  -- (keeping existing logic here)

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Replace the existing trigger (idempotent)
DROP TRIGGER IF EXISTS log_inventory_movement_trigger ON public.inventory_items;
DROP TRIGGER IF EXISTS log_enhanced_inventory_movement_trigger ON public.inventory_items;
CREATE TRIGGER log_enhanced_inventory_movement_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_enhanced_inventory_movement();

-- 6. Create helper functions for manual event logging
CREATE OR REPLACE FUNCTION public.log_user_action(
  p_action TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_event_data JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.system_events (
    event_type, event_category, event_action,
    event_title, event_description,
    entity_type, entity_id,
    user_id,
    event_data,
    severity
  ) VALUES (
    'user_action', 'manual', p_action,
    p_title, p_description,
    p_entity_type, p_entity_id,
    p_user_id,
    p_event_data,
    p_severity
  ) RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.log_system_event(
  p_event_type TEXT,
  p_category TEXT,
  p_action TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_event_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.system_events (
    event_type, event_category, event_action,
    event_title, event_description,
    severity,
    event_data
  ) VALUES (
    p_event_type, p_category, p_action,
    p_title, p_description,
    p_severity,
    p_event_data
  ) RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Enable RLS and create policies (idempotent)
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view system events" ON public.system_events;
CREATE POLICY "Anyone can view system events"
ON public.system_events
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can create system events" ON public.system_events;
CREATE POLICY "Anyone can create system events"
ON public.system_events
FOR INSERT
WITH CHECK (true);

-- 8. Create automatic cleanup function (optional - for data retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_events(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.system_events
  WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
    AND event_type NOT IN ('error'); -- Keep error logs longer

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup operation
  INSERT INTO public.system_events (
    event_type, event_category, event_action,
    event_title, event_description,
    event_data
  ) VALUES (
    'system', 'maintenance', 'cleanup',
    'การทำความสะอาดข้อมูล Log',
    'ลบข้อมูล log เก่าที่มีอายุเกิน ' || retention_days || ' วัน',
    jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days)
  );

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Add comments for documentation
COMMENT ON TABLE public.system_events IS 'Comprehensive event logging table for tracking all system activities, user actions, and business processes';
COMMENT ON COLUMN public.system_events.event_type IS 'Main category: inventory, user_action, system, error, business_process';
COMMENT ON COLUMN public.system_events.event_data IS 'Flexible JSON storage for event-specific data';
COMMENT ON COLUMN public.system_events.changes_before IS 'State before the change (for audit trail)';
COMMENT ON COLUMN public.system_events.changes_after IS 'State after the change (for audit trail)';
COMMENT ON COLUMN public.system_events.related_entities IS 'JSON object containing IDs and types of related entities';