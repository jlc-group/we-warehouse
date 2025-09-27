-- Migration: 3-Phase Sales Workflow System
-- Created: 2025-01-26
-- Description: Implements separate Sales, Warehouse, and Fulfillment phases

-- =====================================================
-- Phase 1: Sales Bills (Sales Team)
-- =====================================================

-- Sales Bills table
CREATE TABLE public.sales_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  bill_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Status tracking
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'confirmed', 'sent_to_warehouse', 'assigned',
    'fulfilled', 'shipped', 'delivered', 'cancelled'
  )),
  bill_type VARCHAR(20) DEFAULT 'sale' CHECK (bill_type IN ('sale', 'quote', 'pro_forma')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Customer & Business Info
  customer_po_number VARCHAR(100),
  payment_terms INTEGER DEFAULT 30,
  due_date TIMESTAMP WITH TIME ZONE,

  -- Amounts
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,

  -- Shipping Address
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_district VARCHAR(100),
  shipping_province VARCHAR(100),
  shipping_postal_code VARCHAR(10),
  shipping_contact_person VARCHAR(200),
  shipping_phone VARCHAR(20),

  -- Team Info
  sales_person_id UUID,
  sales_notes TEXT,
  internal_notes TEXT,

  -- Timestamps & Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Sales Bill Items table
CREATE TABLE public.sales_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_bill_id UUID NOT NULL REFERENCES sales_bills(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,

  -- Product Information (snapshot at time of sale)
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  product_code VARCHAR(100),
  sku VARCHAR(100),

  -- Quantities (no location assigned yet)
  quantity_level1 INTEGER DEFAULT 0,  -- Cartons
  quantity_level2 INTEGER DEFAULT 0,  -- Boxes
  quantity_level3 INTEGER DEFAULT 0,  -- Pieces

  -- Unit Information (snapshot)
  unit_level1_name VARCHAR(50) DEFAULT 'ลัง',
  unit_level2_name VARCHAR(50) DEFAULT 'กล่อง',
  unit_level3_name VARCHAR(50) DEFAULT 'ชิ้น',
  unit_level1_rate INTEGER DEFAULT 1,
  unit_level2_rate INTEGER DEFAULT 1,

  -- Pricing
  unit_price DECIMAL(10,4) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'assigned', 'picked', 'packed', 'shipped'
  )),

  -- Notes
  notes TEXT,
  special_instructions TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(sales_bill_id, line_number)
);

-- =====================================================
-- Phase 2: Warehouse Assignments (Warehouse Team)
-- =====================================================

-- Warehouse Assignments table
CREATE TABLE public.warehouse_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_bill_id UUID NOT NULL REFERENCES sales_bills(id),
  sales_bill_item_id UUID NOT NULL REFERENCES sales_bill_items(id),

  -- Assignment Details
  assigned_by UUID NOT NULL, -- Warehouse team member
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assignment_status VARCHAR(20) DEFAULT 'assigned' CHECK (assignment_status IN (
    'assigned', 'picked', 'packed', 'ready_to_ship', 'shipped'
  )),

  -- Location & Inventory Details
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  source_location VARCHAR(20) NOT NULL, -- A/1/01 format

  -- Assigned Quantities
  assigned_quantity_level1 INTEGER DEFAULT 0,
  assigned_quantity_level2 INTEGER DEFAULT 0,
  assigned_quantity_level3 INTEGER DEFAULT 0,

  -- Actual Picked Quantities (can differ from assigned)
  picked_quantity_level1 INTEGER DEFAULT 0,
  picked_quantity_level2 INTEGER DEFAULT 0,
  picked_quantity_level3 INTEGER DEFAULT 0,

  -- Tracking
  picked_by UUID,
  picked_at TIMESTAMP WITH TIME ZONE,
  packed_by UUID,
  packed_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  picker_notes TEXT,
  warehouse_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Phase 3: Fulfillment Orders (Final Fulfillment)
-- =====================================================

-- Fulfillment Orders table
CREATE TABLE public.fulfillment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_number VARCHAR(50) UNIQUE NOT NULL,
  sales_bill_id UUID NOT NULL REFERENCES sales_bills(id),

  -- Fulfillment Status
  status VARCHAR(20) DEFAULT 'preparing' CHECK (status IN (
    'preparing', 'ready_to_ship', 'shipped', 'delivered', 'returned'
  )),

  -- Shipping Information
  carrier VARCHAR(100),
  tracking_number VARCHAR(100),
  shipping_cost DECIMAL(10,2),
  estimated_delivery_date TIMESTAMP WITH TIME ZONE,
  actual_delivery_date TIMESTAMP WITH TIME ZONE,

  -- Fulfillment Team
  prepared_by UUID,
  prepared_at TIMESTAMP WITH TIME ZONE,
  shipped_by UUID,
  shipped_at TIMESTAMP WITH TIME ZONE,

  -- Stock Movement Tracking
  stock_deducted_at TIMESTAMP WITH TIME ZONE, -- When actual stock deduction occurs
  stock_deducted_by UUID,

  -- Notes
  fulfillment_notes TEXT,
  delivery_instructions TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Enhanced Existing Tables
-- =====================================================

-- Add workflow tracking to customer_orders (maintain backward compatibility)
ALTER TABLE customer_orders
ADD COLUMN IF NOT EXISTS source_sales_bill_id UUID REFERENCES sales_bills(id),
ADD COLUMN IF NOT EXISTS workflow_type VARCHAR(20) DEFAULT 'traditional'
  CHECK (workflow_type IN ('traditional', '3_phase'));

-- Add reservation tracking to inventory_items
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS reserved_level1_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserved_level2_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserved_level3_quantity INTEGER DEFAULT 0;

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Sales Bills indexes
CREATE INDEX idx_sales_bills_status ON sales_bills(status);
CREATE INDEX idx_sales_bills_customer ON sales_bills(customer_id);
CREATE INDEX idx_sales_bills_bill_date ON sales_bills(bill_date);
CREATE INDEX idx_sales_bills_created_at ON sales_bills(created_at);

-- Sales Bill Items indexes
CREATE INDEX idx_sales_bill_items_bill_id ON sales_bill_items(sales_bill_id);
CREATE INDEX idx_sales_bill_items_product_id ON sales_bill_items(product_id);
CREATE INDEX idx_sales_bill_items_status ON sales_bill_items(status);

-- Warehouse Assignments indexes
CREATE INDEX idx_warehouse_assignments_bill_id ON warehouse_assignments(sales_bill_id);
CREATE INDEX idx_warehouse_assignments_item_id ON warehouse_assignments(sales_bill_item_id);
CREATE INDEX idx_warehouse_assignments_inventory_id ON warehouse_assignments(inventory_item_id);
CREATE INDEX idx_warehouse_assignments_location ON warehouse_assignments(source_location);
CREATE INDEX idx_warehouse_assignments_status ON warehouse_assignments(assignment_status);
CREATE INDEX idx_warehouse_assignments_assigned_at ON warehouse_assignments(assigned_at);

-- Fulfillment Orders indexes
CREATE INDEX idx_fulfillment_orders_bill_id ON fulfillment_orders(sales_bill_id);
CREATE INDEX idx_fulfillment_orders_status ON fulfillment_orders(status);
CREATE INDEX idx_fulfillment_orders_shipped_at ON fulfillment_orders(shipped_at);
CREATE INDEX idx_fulfillment_orders_tracking ON fulfillment_orders(tracking_number);

-- =====================================================
-- Triggers for Auto-incrementing Numbers
-- =====================================================

-- Auto-increment bill numbers
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
DECLARE
  new_number INTEGER;
  prefix TEXT := 'SB';
  year_month TEXT := TO_CHAR(CURRENT_DATE, 'YYMM');
BEGIN
  -- Get the next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(bill_number FROM LENGTH(prefix || year_month) + 1)
      AS INTEGER
    )
  ), 0) + 1
  INTO new_number
  FROM sales_bills
  WHERE bill_number LIKE prefix || year_month || '%';

  -- Format as SB250112001, SB250112002, etc.
  NEW.bill_number := prefix || year_month || LPAD(new_number::TEXT, 3, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bill number generation
CREATE TRIGGER trigger_generate_bill_number
  BEFORE INSERT ON sales_bills
  FOR EACH ROW
  WHEN (NEW.bill_number IS NULL OR NEW.bill_number = '')
  EXECUTE FUNCTION generate_bill_number();

-- Auto-increment fulfillment numbers
CREATE OR REPLACE FUNCTION generate_fulfillment_number()
RETURNS TRIGGER AS $$
DECLARE
  new_number INTEGER;
  prefix TEXT := 'FL';
  year_month TEXT := TO_CHAR(CURRENT_DATE, 'YYMM');
BEGIN
  -- Get the next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(fulfillment_number FROM LENGTH(prefix || year_month) + 1)
      AS INTEGER
    )
  ), 0) + 1
  INTO new_number
  FROM fulfillment_orders
  WHERE fulfillment_number LIKE prefix || year_month || '%';

  -- Format as FL250112001, FL250112002, etc.
  NEW.fulfillment_number := prefix || year_month || LPAD(new_number::TEXT, 3, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for fulfillment number generation
CREATE TRIGGER trigger_generate_fulfillment_number
  BEFORE INSERT ON fulfillment_orders
  FOR EACH ROW
  WHEN (NEW.fulfillment_number IS NULL OR NEW.fulfillment_number = '')
  EXECUTE FUNCTION generate_fulfillment_number();

-- =====================================================
-- Status Update Triggers
-- =====================================================

-- Update sales_bill status based on item statuses
CREATE OR REPLACE FUNCTION update_sales_bill_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update parent sales_bill status based on item statuses
  UPDATE sales_bills
  SET
    status = CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM sales_bill_items
        WHERE sales_bill_id = NEW.sales_bill_id
        AND status != 'shipped'
      ) THEN 'shipped'
      WHEN EXISTS (
        SELECT 1 FROM sales_bill_items
        WHERE sales_bill_id = NEW.sales_bill_id
        AND status IN ('picked', 'packed')
      ) THEN 'fulfilled'
      WHEN EXISTS (
        SELECT 1 FROM sales_bill_items
        WHERE sales_bill_id = NEW.sales_bill_id
        AND status = 'assigned'
      ) THEN 'assigned'
      ELSE 'sent_to_warehouse'
    END,
    updated_at = NOW()
  WHERE id = NEW.sales_bill_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status updates
CREATE TRIGGER trigger_update_sales_bill_status
  AFTER UPDATE OF status ON sales_bill_items
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_bill_status();

-- =====================================================
-- RLS Policies (Row Level Security)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE sales_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_orders ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on roles)
CREATE POLICY "Enable read access for all users" ON sales_bills
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON sales_bills
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON sales_bill_items
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON sales_bill_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON warehouse_assignments
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON warehouse_assignments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON fulfillment_orders
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON fulfillment_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE sales_bills IS '3-Phase Workflow: Phase 1 - Sales team creates bills without location assignment';
COMMENT ON TABLE sales_bill_items IS 'Items in sales bills - no location assignment at this stage';
COMMENT ON TABLE warehouse_assignments IS '3-Phase Workflow: Phase 2 - Warehouse team assigns locations to sales bill items';
COMMENT ON TABLE fulfillment_orders IS '3-Phase Workflow: Phase 3 - Final fulfillment and stock deduction';

COMMENT ON COLUMN sales_bills.status IS 'Workflow status: draft → confirmed → sent_to_warehouse → assigned → fulfilled → shipped → delivered';
COMMENT ON COLUMN warehouse_assignments.assignment_status IS 'Assignment status: assigned → picked → packed → ready_to_ship → shipped';
COMMENT ON COLUMN inventory_items.reserved_level1_quantity IS 'Quantity reserved but not yet deducted from available stock';

-- =====================================================
-- Initial Data / Sample Records (Optional)
-- =====================================================

-- Sample workflow types for existing orders
UPDATE customer_orders
SET workflow_type = 'traditional'
WHERE workflow_type IS NULL;

COMMIT;