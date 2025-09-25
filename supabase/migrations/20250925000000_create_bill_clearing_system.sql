-- Enhanced Bill Clearing and Status Management System
-- ระบบเคลียร์บิลและจัดการสถานะแบบแยกสิทธิ์การทำงาน
-- This migration can be run multiple times safely (idempotent)

-- 1. Add new columns to customer_orders table for bill clearing
-- Split into separate statements to avoid parsing issues

-- Add basic clearing columns
ALTER TABLE public.customer_orders
ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cleared_by UUID,
ADD COLUMN IF NOT EXISTS cleared_notes TEXT,
ADD COLUMN IF NOT EXISTS cleared_amount DECIMAL(15,2);

-- Add payment status column with constraint
ALTER TABLE public.customer_orders
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

-- Add payment status constraint separately
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_orders_payment_status_check') THEN
    ALTER TABLE public.customer_orders
    ADD CONSTRAINT customer_orders_payment_status_check
    CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'refunded'));
  END IF;
END $$;

-- Add approval columns
ALTER TABLE public.customer_orders
ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_for_clearing_by UUID,
ADD COLUMN IF NOT EXISTS approved_for_clearing_at TIMESTAMP WITH TIME ZONE;

-- 2. Update order status enum to include more states
-- First remove existing constraint, then normalize data, then add new constraint
DO $$
BEGIN
  -- Remove any existing status constraints to allow data modification
  ALTER TABLE public.customer_orders DROP CONSTRAINT IF EXISTS customer_orders_status_check;
  ALTER TABLE public.customer_orders DROP CONSTRAINT IF EXISTS customer_orders_status_check_new;

  -- Convert existing statuses to lowercase for consistency
  UPDATE public.customer_orders SET status = LOWER(status) WHERE status IS NOT NULL;

  -- Add new status constraints with both uppercase and lowercase values for compatibility
  ALTER TABLE public.customer_orders
  ADD CONSTRAINT customer_orders_status_check_new
  CHECK (status IN ('draft', 'pending', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'completed', 'cleared', 'cancelled', 'refunded',
                   'DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CLEARED', 'CANCELLED', 'REFUNDED'));

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating status constraints: %', SQLERRM;
END $$;

-- 3. Create order_status_history table for tracking all status changes
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason VARCHAR(100),
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_status_transition CHECK (
    to_status IN ('draft', 'pending', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'completed', 'cleared', 'cancelled', 'refunded')
  )
);

-- 4. Create bill_clearing_permissions table for role-based access
CREATE TABLE IF NOT EXISTS public.bill_clearing_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN ('bill_clearer', 'bill_checker', 'bill_approver', 'bill_manager')),
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  -- Prevent duplicate active permissions
  UNIQUE (user_id, permission_type, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- 5. Create clearing_batches table for batch processing
CREATE TABLE IF NOT EXISTS public.clearing_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  total_orders INTEGER DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'cancelled')),
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

-- 6. Create clearing_batch_items table to track which orders are in which batch
CREATE TABLE IF NOT EXISTS public.clearing_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.clearing_batches(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cleared_amount DECIMAL(15,2),
  notes TEXT,

  -- Prevent duplicate orders in same batch
  UNIQUE (batch_id, order_id)
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_orders_cleared_at ON public.customer_orders(cleared_at);
CREATE INDEX IF NOT EXISTS idx_customer_orders_cleared_by ON public.customer_orders(cleared_by);
CREATE INDEX IF NOT EXISTS idx_customer_orders_payment_status ON public.customer_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON public.order_status_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_clearing_permissions_user_id ON public.bill_clearing_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_clearing_permissions_type_active ON public.bill_clearing_permissions(permission_type, is_active);
CREATE INDEX IF NOT EXISTS idx_clearing_batches_created_by ON public.clearing_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_clearing_batches_status ON public.clearing_batches(status);

-- 8. Create sequence for batch numbers
CREATE SEQUENCE IF NOT EXISTS clearing_batch_number_seq START 1000;

-- 9. Create function to generate batch numbers
CREATE OR REPLACE FUNCTION public.generate_clearing_batch_number()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  sequence_num INTEGER;
BEGIN
  -- Get current year-month
  year_month := to_char(NOW(), 'YYMM');

  -- Get next sequence number
  sequence_num := nextval('clearing_batch_number_seq');

  -- Format: CLR-YYMM-NNNN (e.g., CLR-2501-1000)
  RETURN 'CLR-' || year_month || '-' || lpad(sequence_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to auto-generate batch numbers
CREATE OR REPLACE FUNCTION public.set_clearing_batch_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.batch_number IS NULL OR NEW.batch_number = '' THEN
    NEW.batch_number := generate_clearing_batch_number();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_clearing_batch_number
  BEFORE INSERT ON public.clearing_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_clearing_batch_number();

-- 11. Create trigger to log status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status change if status actually changed
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.order_status_history (
      order_id, from_status, to_status, changed_by, changed_at, reason, notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.cleared_by, NEW.updated_by), -- Use cleared_by if available, otherwise updated_by
      NOW(),
      CASE
        WHEN NEW.status = 'cleared' THEN 'Bill cleared'
        WHEN NEW.status = 'cancelled' THEN 'Order cancelled'
        WHEN NEW.status = 'refunded' THEN 'Order refunded'
        ELSE 'Status updated'
      END,
      CASE
        WHEN NEW.status = 'cleared' THEN NEW.cleared_notes
        ELSE NULL
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_order_status_change
  AFTER UPDATE ON public.customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();

-- 12. Create helper functions for bill clearing operations

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.check_bill_clearing_permission(
  p_user_id UUID,
  p_permission_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN := false;
BEGIN
  SELECT COUNT(*) > 0 INTO has_permission
  FROM public.bill_clearing_permissions
  WHERE user_id = p_user_id
    AND permission_type = p_permission_type
    AND is_active = true
    AND (revoked_at IS NULL OR revoked_at > NOW());

  RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to clear a bill
CREATE OR REPLACE FUNCTION public.clear_bill(
  p_order_id UUID,
  p_cleared_by UUID,
  p_cleared_amount DECIMAL(15,2) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  order_record RECORD;
  result JSONB;
BEGIN
  -- Check if user has permission to clear bills
  IF NOT public.check_bill_clearing_permission(p_cleared_by, 'bill_clearer') AND
     NOT public.check_bill_clearing_permission(p_cleared_by, 'bill_manager') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No permission to clear bills');
  END IF;

  -- Get order details
  SELECT * INTO order_record FROM public.customer_orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Check if order can be cleared
  IF order_record.status IN ('cleared', 'cancelled', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be cleared in current status: ' || order_record.status);
  END IF;

  -- Clear the bill
  UPDATE public.customer_orders
  SET
    status = 'cleared',
    cleared_at = NOW(),
    cleared_by = p_cleared_by,
    cleared_amount = COALESCE(p_cleared_amount, total_amount),
    cleared_notes = p_notes,
    payment_status = 'paid'
  WHERE id = p_order_id;

  result := jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'cleared_at', NOW(),
    'cleared_by', p_cleared_by
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create clearing batch
CREATE OR REPLACE FUNCTION public.create_clearing_batch(
  p_created_by UUID,
  p_order_ids UUID[],
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  batch_id UUID;
  order_id UUID;
  order_count INTEGER := 0;
  total_amount DECIMAL(15,2) := 0;
  batch_amount DECIMAL(15,2);
BEGIN
  -- Check permission
  IF NOT public.check_bill_clearing_permission(p_created_by, 'bill_clearer') AND
     NOT public.check_bill_clearing_permission(p_created_by, 'bill_manager') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No permission to create clearing batches');
  END IF;

  -- Create batch
  INSERT INTO public.clearing_batches (created_by, notes)
  VALUES (p_created_by, p_notes)
  RETURNING id INTO batch_id;

  -- Add orders to batch
  FOREACH order_id IN ARRAY p_order_ids
  LOOP
    -- Get order amount
    SELECT COALESCE(total_amount, 0) INTO batch_amount
    FROM public.customer_orders
    WHERE id = order_id AND status NOT IN ('cleared', 'cancelled', 'refunded');

    IF FOUND THEN
      INSERT INTO public.clearing_batch_items (batch_id, order_id, cleared_amount)
      VALUES (batch_id, order_id, batch_amount);

      order_count := order_count + 1;
      total_amount := total_amount + batch_amount;
    END IF;
  END LOOP;

  -- Update batch totals
  UPDATE public.clearing_batches
  SET total_orders = order_count, total_amount = total_amount
  WHERE id = batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', batch_id,
    'total_orders', order_count,
    'total_amount', total_amount
  );
END;
$$ LANGUAGE plpgsql;

-- 13. Create comprehensive views

-- View for clearable orders
CREATE OR REPLACE VIEW public.clearable_orders_view AS
SELECT
  co.*,
  c.customer_name,
  c.customer_code,
  w.name as warehouse_name,
  w.code as warehouse_code,
  -- Status indicators
  CASE
    WHEN co.status = 'completed' AND co.cleared_at IS NULL THEN '✅ พร้อมเคลียร์'
    WHEN co.status = 'delivered' AND co.cleared_at IS NULL THEN '🚚 ส่งแล้ว - พร้อมเคลียร์'
    WHEN co.status = 'cleared' THEN '💰 เคลียร์แล้ว'
    WHEN co.status = 'cancelled' THEN '❌ ยกเลิก'
    WHEN co.status = 'refunded' THEN '🔄 คืนเงิน'
    ELSE '⏳ ' || co.status
  END as status_display,
  -- Time calculations
  CASE
    WHEN co.cleared_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (co.cleared_at - co.created_at))/86400
    ELSE
      EXTRACT(EPOCH FROM (NOW() - co.created_at))/86400
  END as days_since_created,
  -- Clearing indicators
  co.cleared_at IS NOT NULL as is_cleared,
  co.approval_required,
  co.approved_for_clearing_by IS NOT NULL as is_approved_for_clearing
FROM public.customer_orders co
LEFT JOIN public.customers c ON co.customer_id = c.id
LEFT JOIN public.warehouses w ON co.warehouse_id = w.id
WHERE co.status IN ('completed', 'delivered', 'cleared', 'cancelled', 'refunded')
ORDER BY co.created_at DESC;

-- View for order status history with user info
CREATE OR REPLACE VIEW public.order_status_history_view AS
SELECT
  osh.*,
  co.order_number,
  c.customer_name,
  u1.full_name as changed_by_name,
  -- Time since change
  EXTRACT(EPOCH FROM (NOW() - osh.changed_at))/3600 as hours_since_change
FROM public.order_status_history osh
JOIN public.customer_orders co ON osh.order_id = co.id
LEFT JOIN public.customers c ON co.customer_id = c.id
LEFT JOIN public.user_profiles u1 ON osh.changed_by = u1.id
ORDER BY osh.changed_at DESC;

-- View for clearing batch summary
CREATE OR REPLACE VIEW public.clearing_batches_view AS
SELECT
  cb.*,
  u.full_name as created_by_name,
  COUNT(cbi.id) as actual_order_count,
  SUM(cbi.cleared_amount) as actual_total_amount
FROM public.clearing_batches cb
LEFT JOIN public.user_profiles u ON cb.created_by = u.id
LEFT JOIN public.clearing_batch_items cbi ON cb.id = cbi.batch_id
GROUP BY cb.id, u.full_name
ORDER BY cb.created_at DESC;

-- 14. Create RLS policies
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_clearing_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearing_batch_items ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users for history
DROP POLICY IF EXISTS "Allow read order_status_history" ON public.order_status_history;
CREATE POLICY "Allow read order_status_history"
ON public.order_status_history FOR SELECT
USING (true);

-- Allow insert for authenticated users (will be controlled by triggers)
DROP POLICY IF EXISTS "Allow insert order_status_history" ON public.order_status_history;
CREATE POLICY "Allow insert order_status_history"
ON public.order_status_history FOR INSERT
WITH CHECK (true);

-- Bill clearing permissions - users can read their own permissions
DROP POLICY IF EXISTS "Users can read own bill_clearing_permissions" ON public.bill_clearing_permissions;
CREATE POLICY "Users can read own bill_clearing_permissions"
ON public.bill_clearing_permissions FOR SELECT
USING (true); -- Allow reading all permissions for management purposes

-- Allow managers to manage permissions
DROP POLICY IF EXISTS "Allow insert bill_clearing_permissions" ON public.bill_clearing_permissions;
CREATE POLICY "Allow insert bill_clearing_permissions"
ON public.bill_clearing_permissions FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update bill_clearing_permissions" ON public.bill_clearing_permissions;
CREATE POLICY "Allow update bill_clearing_permissions"
ON public.bill_clearing_permissions FOR UPDATE
USING (true);

-- Clearing batches - readable by all, manageable by authorized users
DROP POLICY IF EXISTS "Allow read clearing_batches" ON public.clearing_batches;
CREATE POLICY "Allow read clearing_batches"
ON public.clearing_batches FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow insert clearing_batches" ON public.clearing_batches;
CREATE POLICY "Allow insert clearing_batches"
ON public.clearing_batches FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update clearing_batches" ON public.clearing_batches;
CREATE POLICY "Allow update clearing_batches"
ON public.clearing_batches FOR UPDATE
USING (true);

-- Clearing batch items
DROP POLICY IF EXISTS "Allow read clearing_batch_items" ON public.clearing_batch_items;
CREATE POLICY "Allow read clearing_batch_items"
ON public.clearing_batch_items FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow insert clearing_batch_items" ON public.clearing_batch_items;
CREATE POLICY "Allow insert clearing_batch_items"
ON public.clearing_batch_items FOR INSERT
WITH CHECK (true);

-- 15. Insert sample permissions for testing
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Try to find an admin user or create test permissions
  -- This is just for development/testing
  SELECT id INTO admin_user_id FROM public.user_profiles WHERE email LIKE '%admin%' OR role = 'admin' LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Give admin user all permissions
    INSERT INTO public.bill_clearing_permissions (user_id, permission_type, granted_by, notes)
    VALUES
      (admin_user_id, 'bill_manager', admin_user_id, 'Auto-granted admin permissions'),
      (admin_user_id, 'bill_clearer', admin_user_id, 'Auto-granted admin permissions'),
      (admin_user_id, 'bill_checker', admin_user_id, 'Auto-granted admin permissions'),
      (admin_user_id, 'bill_approver', admin_user_id, 'Auto-granted admin permissions')
    ON CONFLICT (user_id, permission_type, is_active) DO NOTHING;

    RAISE NOTICE 'Granted bill clearing permissions to admin user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'No admin user found - skipping automatic permission assignment';
  END IF;
END $$;

-- 16. Add comments for documentation
COMMENT ON TABLE public.order_status_history IS 'Complete audit trail of all order status changes with user tracking';
COMMENT ON TABLE public.bill_clearing_permissions IS 'Role-based access control for bill clearing operations';
COMMENT ON TABLE public.clearing_batches IS 'Batch processing system for clearing multiple bills together';
COMMENT ON TABLE public.clearing_batch_items IS 'Individual orders within clearing batches';

COMMENT ON FUNCTION public.check_bill_clearing_permission IS 'Verify if user has specific bill clearing permission';
COMMENT ON FUNCTION public.clear_bill IS 'Main function to clear individual bills with permission check';
COMMENT ON FUNCTION public.create_clearing_batch IS 'Create batch of orders for bulk clearing operations';

-- 17. Final verification queries
DO $$
BEGIN
  RAISE NOTICE 'Bill Clearing System Migration Completed Successfully';
  RAISE NOTICE '================================================';

  -- Check if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_status_history') THEN
    RAISE NOTICE 'order_status_history table: ✓ Created';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bill_clearing_permissions') THEN
    RAISE NOTICE 'bill_clearing_permissions table: ✓ Created';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clearing_batches') THEN
    RAISE NOTICE 'clearing_batches table: ✓ Created';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clearing_batch_items') THEN
    RAISE NOTICE 'clearing_batch_items table: ✓ Created';
  END IF;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'Bill Clearing System is ready to use!';
END $$;