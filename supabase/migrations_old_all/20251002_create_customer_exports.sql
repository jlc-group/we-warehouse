-- Create customer_exports table for tracking product exports to customers
CREATE TABLE IF NOT EXISTS public.customer_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID,
    customer_name TEXT NOT NULL,
    customer_code TEXT,
    product_name TEXT NOT NULL,
    product_code TEXT,
    inventory_item_id UUID,
    quantity_exported INTEGER NOT NULL DEFAULT 0,
    unit TEXT,
    from_location TEXT,
    notes TEXT,
    po_reference TEXT,
    export_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_exports_customer_name ON public.customer_exports (customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_exports_product_name ON public.customer_exports (product_name);
CREATE INDEX IF NOT EXISTS idx_customer_exports_export_date ON public.customer_exports (export_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_exports_customer_id ON public.customer_exports (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_exports_inventory_item_id ON public.customer_exports (inventory_item_id);

-- Enable RLS
ALTER TABLE public.customer_exports ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (allow all operations - no authentication required)
CREATE POLICY "Allow all access to customer_exports" ON public.customer_exports
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.customer_exports TO authenticated;
GRANT ALL ON public.customer_exports TO anon;

-- Add table comments
COMMENT ON TABLE public.customer_exports IS 'Tracks product exports to customers for history and analytics';
COMMENT ON COLUMN public.customer_exports.customer_name IS 'Name of the customer receiving the products';
COMMENT ON COLUMN public.customer_exports.customer_code IS 'Customer code for identification';
COMMENT ON COLUMN public.customer_exports.product_name IS 'Name of the product being exported';
COMMENT ON COLUMN public.customer_exports.product_code IS 'Product SKU or code';
COMMENT ON COLUMN public.customer_exports.inventory_item_id IS 'Reference to inventory_items table';
COMMENT ON COLUMN public.customer_exports.quantity_exported IS 'Total quantity exported (in base units/pieces)';
COMMENT ON COLUMN public.customer_exports.unit IS 'Unit description (e.g., "2 ลัง + 3 กล่อง")';
COMMENT ON COLUMN public.customer_exports.from_location IS 'Warehouse location products were exported from';
COMMENT ON COLUMN public.customer_exports.notes IS 'Additional notes about the export';
COMMENT ON COLUMN public.customer_exports.po_reference IS 'Customer PO reference number';
