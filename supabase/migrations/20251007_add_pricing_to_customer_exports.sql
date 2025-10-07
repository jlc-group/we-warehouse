-- Add pricing fields to customer_exports table
ALTER TABLE public.customer_exports
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS total_value DECIMAL(12, 2);

-- Add comments
COMMENT ON COLUMN public.customer_exports.unit_price IS 'Price per unit (per piece)';
COMMENT ON COLUMN public.customer_exports.total_value IS 'Total export value (unit_price * quantity_exported)';

-- Create index for reporting
CREATE INDEX IF NOT EXISTS idx_customer_exports_total_value ON public.customer_exports (total_value DESC);
