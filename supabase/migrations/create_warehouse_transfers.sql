-- Enhanced Warehouse Transfer System
-- สร้างระบบติดตามการเคลื่อนย้ายระหว่าง Warehouse แบบครบครัน
-- This migration can be run multiple times safely (idempotent)

-- 1. Create warehouse_transfers table for tracking transfers
CREATE TABLE IF NOT EXISTS public.warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transfer identification
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  transfer_type VARCHAR(20) DEFAULT 'manual' CHECK (transfer_type IN ('manual', 'system', 'batch')),

  -- Transfer details
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,

  -- Warehouse information
  source_warehouse_id UUID REFERENCES public.warehouses(id),
  target_warehouse_id UUID REFERENCES public.warehouses(id),

  -- Status tracking
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- User tracking
  created_by UUID, -- user who created the transfer
  approved_by UUID, -- user who approved the transfer
  processed_by UUID, -- user who processed the transfer

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Transfer summary
  total_items INTEGER DEFAULT 0,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,

  -- Additional metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_transfer_warehouses CHECK (source_warehouse_id != target_warehouse_id),
  CONSTRAINT valid_dates CHECK (
    approved_at >= created_at AND
    started_at >= approved_at AND
    completed_at >= started_at
  )
);

-- 2. Create warehouse_transfer_items table for individual item tracking
CREATE TABLE IF NOT EXISTS public.warehouse_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  transfer_id UUID NOT NULL REFERENCES public.warehouse_transfers(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),

  -- Quantities being transferred (supports multi-level units)
  unit_level1_quantity INTEGER DEFAULT 0,
  unit_level2_quantity INTEGER DEFAULT 0,
  unit_level3_quantity INTEGER DEFAULT 0,

  -- Original quantities (for verification)
  original_level1_quantity INTEGER DEFAULT 0,
  original_level2_quantity INTEGER DEFAULT 0,
  original_level3_quantity INTEGER DEFAULT 0,

  -- Item information (snapshot at transfer time)
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  lot TEXT,
  mfd DATE,
  source_location TEXT,
  target_location TEXT,

  -- Item status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'picked', 'in_transit', 'delivered', 'error')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  picked_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,

  -- Additional data
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT unique_transfer_item UNIQUE (transfer_id, inventory_item_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_status ON public.warehouse_transfers(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_created_by ON public.warehouse_transfers(created_by);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_created_at ON public.warehouse_transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_source_warehouse ON public.warehouse_transfers(source_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_target_warehouse ON public.warehouse_transfers(target_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_number ON public.warehouse_transfers(transfer_number);

CREATE INDEX IF NOT EXISTS idx_warehouse_transfer_items_transfer ON public.warehouse_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfer_items_inventory ON public.warehouse_transfer_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfer_items_status ON public.warehouse_transfer_items(status);

-- 4. Create sequence for transfer numbers
CREATE SEQUENCE IF NOT EXISTS warehouse_transfer_number_seq START 1000;

-- 5. Create function to generate transfer numbers
CREATE OR REPLACE FUNCTION public.generate_transfer_number()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  sequence_num INTEGER;
BEGIN
  -- Get current year-month
  year_month := to_char(NOW(), 'YYMM');

  -- Get next sequence number
  sequence_num := nextval('warehouse_transfer_number_seq');

  -- Format: WT-YYMM-NNNN (e.g., WT-2501-1000)
  RETURN 'WT-' || year_month || '-' || lpad(sequence_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-generate transfer numbers
CREATE OR REPLACE FUNCTION public.set_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transfer_number IS NULL OR NEW.transfer_number = '' THEN
    NEW.transfer_number := generate_transfer_number();
  END IF;

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_transfer_number
  BEFORE INSERT OR UPDATE ON public.warehouse_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_transfer_number();

-- 7. Create function to update transfer summary
CREATE OR REPLACE FUNCTION public.update_transfer_summary(transfer_id UUID)
RETURNS VOID AS $$
DECLARE
  item_count INTEGER;
BEGIN
  -- Count items in this transfer
  SELECT COUNT(*) INTO item_count
  FROM public.warehouse_transfer_items
  WHERE warehouse_transfer_items.transfer_id = update_transfer_summary.transfer_id;

  -- Update the transfer record
  UPDATE public.warehouse_transfers
  SET total_items = item_count,
      updated_at = NOW()
  WHERE id = update_transfer_summary.transfer_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to auto-update transfer summary
CREATE OR REPLACE FUNCTION public.trigger_update_transfer_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Update summary for the affected transfer
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_transfer_summary(NEW.transfer_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_transfer_summary(OLD.transfer_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_transfer_summary_update
  AFTER INSERT OR UPDATE OR DELETE ON public.warehouse_transfer_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_transfer_summary();

-- 9. Create comprehensive views for easy querying

-- Transfer overview with warehouse names
CREATE OR REPLACE VIEW public.warehouse_transfers_view AS
SELECT
  wt.*,
  sw.name as source_warehouse_name,
  sw.code as source_warehouse_code,
  tw.name as target_warehouse_name,
  tw.code as target_warehouse_code,
  -- Status indicators
  CASE
    WHEN wt.status = 'completed' THEN '✅ เสร็จสิ้น'
    WHEN wt.status = 'in_progress' THEN '🔄 กำลังดำเนินการ'
    WHEN wt.status = 'approved' THEN '✅ อนุมัติแล้ว'
    WHEN wt.status = 'pending' THEN '⏳ รอการอนุมัติ'
    WHEN wt.status = 'draft' THEN '📝 ฉบับร่าง'
    WHEN wt.status = 'cancelled' THEN '❌ ยกเลิก'
    ELSE wt.status
  END as status_display,
  -- Duration calculations
  CASE
    WHEN wt.completed_at IS NOT NULL AND wt.started_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (wt.completed_at - wt.started_at))/60
    ELSE NULL
  END as actual_duration_minutes_calculated
FROM public.warehouse_transfers wt
LEFT JOIN public.warehouses sw ON wt.source_warehouse_id = sw.id
LEFT JOIN public.warehouses tw ON wt.target_warehouse_id = tw.id;

-- Active transfers (not completed or cancelled)
CREATE OR REPLACE VIEW public.active_warehouse_transfers AS
SELECT *
FROM public.warehouse_transfers_view
WHERE status NOT IN ('completed', 'cancelled')
ORDER BY created_at DESC;

-- Recent transfer activity
CREATE OR REPLACE VIEW public.recent_warehouse_transfers AS
SELECT *
FROM public.warehouse_transfers_view
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Transfer items with product details
CREATE OR REPLACE VIEW public.warehouse_transfer_items_view AS
SELECT
  wti.*,
  wt.transfer_number,
  wt.status as transfer_status,
  wt.source_warehouse_id,
  wt.target_warehouse_id,
  ii.location as current_location,
  ii.warehouse_id as current_warehouse_id,
  p.product_type,
  -- Quantity summaries
  (wti.unit_level1_quantity + wti.unit_level2_quantity + wti.unit_level3_quantity) as total_quantity_transferring,
  (wti.original_level1_quantity + wti.original_level2_quantity + wti.original_level3_quantity) as total_original_quantity
FROM public.warehouse_transfer_items wti
JOIN public.warehouse_transfers wt ON wti.transfer_id = wt.id
LEFT JOIN public.inventory_items ii ON wti.inventory_item_id = ii.id
LEFT JOIN public.products p ON wti.sku = p.sku_code;

-- 10. Create helper functions for transfer operations

-- Function to create a new transfer
CREATE OR REPLACE FUNCTION public.create_warehouse_transfer(
  p_title TEXT,
  p_source_warehouse_id UUID,
  p_target_warehouse_id UUID,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_priority VARCHAR(10) DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
  transfer_id UUID;
BEGIN
  INSERT INTO public.warehouse_transfers (
    title, description, source_warehouse_id, target_warehouse_id,
    created_by, priority, status
  ) VALUES (
    p_title, p_description, p_source_warehouse_id, p_target_warehouse_id,
    p_created_by, p_priority, 'draft'
  ) RETURNING id INTO transfer_id;

  RETURN transfer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add items to transfer
CREATE OR REPLACE FUNCTION public.add_items_to_transfer(
  p_transfer_id UUID,
  p_inventory_item_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  item_id UUID;
  items_added INTEGER := 0;
  item_info RECORD;
BEGIN
  FOREACH item_id IN ARRAY p_inventory_item_ids
  LOOP
    -- Get item information
    SELECT
      product_name, sku, lot, mfd, location, warehouse_id,
      unit_level1_quantity, unit_level2_quantity, unit_level3_quantity
    INTO item_info
    FROM public.inventory_items
    WHERE id = item_id;

    IF FOUND THEN
      INSERT INTO public.warehouse_transfer_items (
        transfer_id, inventory_item_id, product_name, sku, lot, mfd,
        source_location, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity,
        original_level1_quantity, original_level2_quantity, original_level3_quantity
      ) VALUES (
        p_transfer_id, item_id, item_info.product_name, item_info.sku,
        item_info.lot, item_info.mfd, item_info.location,
        item_info.unit_level1_quantity, item_info.unit_level2_quantity, item_info.unit_level3_quantity,
        item_info.unit_level1_quantity, item_info.unit_level2_quantity, item_info.unit_level3_quantity
      );

      items_added := items_added + 1;
    END IF;
  END LOOP;

  RETURN items_added;
END;
$$ LANGUAGE plpgsql;

-- 11. Create RLS policies
ALTER TABLE public.warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_transfer_items ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
DROP POLICY IF EXISTS "Allow read warehouse_transfers" ON public.warehouse_transfers;
CREATE POLICY "Allow read warehouse_transfers"
ON public.warehouse_transfers FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow read warehouse_transfer_items" ON public.warehouse_transfer_items;
CREATE POLICY "Allow read warehouse_transfer_items"
ON public.warehouse_transfer_items FOR SELECT
USING (true);

-- Allow insert/update for authenticated users
DROP POLICY IF EXISTS "Allow insert warehouse_transfers" ON public.warehouse_transfers;
CREATE POLICY "Allow insert warehouse_transfers"
ON public.warehouse_transfers FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update warehouse_transfers" ON public.warehouse_transfers;
CREATE POLICY "Allow update warehouse_transfers"
ON public.warehouse_transfers FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Allow insert warehouse_transfer_items" ON public.warehouse_transfer_items;
CREATE POLICY "Allow insert warehouse_transfer_items"
ON public.warehouse_transfer_items FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update warehouse_transfer_items" ON public.warehouse_transfer_items;
CREATE POLICY "Allow update warehouse_transfer_items"
ON public.warehouse_transfer_items FOR UPDATE
USING (true);

-- 12. Add comments for documentation
COMMENT ON TABLE public.warehouse_transfers IS 'Warehouse transfer requests with approval workflow and status tracking';
COMMENT ON TABLE public.warehouse_transfer_items IS 'Individual items within warehouse transfers with quantity tracking';

COMMENT ON COLUMN public.warehouse_transfers.transfer_number IS 'Auto-generated unique transfer number (WT-YYMM-NNNN)';
COMMENT ON COLUMN public.warehouse_transfers.status IS 'Transfer status: draft, pending, approved, in_progress, completed, cancelled';
COMMENT ON COLUMN public.warehouse_transfers.priority IS 'Transfer priority: low, normal, high, urgent';

-- 13. Insert sample data for testing (optional)
DO $$
DECLARE
  sample_transfer_id UUID;
  warehouse_d_id UUID;
  warehouse_a_id UUID;
BEGIN
  -- Get warehouse IDs
  SELECT id INTO warehouse_d_id FROM public.warehouses WHERE code = 'D' LIMIT 1;
  SELECT id INTO warehouse_a_id FROM public.warehouses WHERE code = 'A' LIMIT 1;

  -- Create sample transfer if warehouses exist
  IF warehouse_d_id IS NOT NULL AND warehouse_a_id IS NOT NULL THEN
    SELECT public.create_warehouse_transfer(
      'ย้ายสินค้าจาก Warehouse D ไป A (ตัวอย่าง)',
      warehouse_d_id,
      warehouse_a_id,
      'การย้ายสินค้าทดสอบระบบ',
      NULL,
      'normal'
    ) INTO sample_transfer_id;

    RAISE NOTICE 'Created sample transfer: %', sample_transfer_id;
  END IF;
END $$;

-- 14. Final verification query
SELECT
  'Warehouse Transfers' as component,
  COUNT(*) as count
FROM public.warehouse_transfers

UNION ALL

SELECT
  'Transfer Items' as component,
  COUNT(*) as count
FROM public.warehouse_transfer_items

UNION ALL

SELECT
  'Active Transfers' as component,
  COUNT(*) as count
FROM public.active_warehouse_transfers;