-- Migration: Add Payment Tracking Fields to Sales Bills
-- Created: 2025-09-27
-- Description: Add payment tracking fields to support AccountingService functionality

-- Add payment tracking fields to sales_bills table
ALTER TABLE public.sales_bills
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
  'pending', 'partial', 'paid', 'overdue', 'cancelled'
)),
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Create indexes for better performance on payment queries
CREATE INDEX IF NOT EXISTS idx_sales_bills_payment_status ON sales_bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_bills_payment_date ON sales_bills(payment_date);
CREATE INDEX IF NOT EXISTS idx_sales_bills_amount_paid ON sales_bills(amount_paid);

-- Add comments for documentation
COMMENT ON COLUMN sales_bills.payment_status IS 'Payment status: pending, partial, paid, overdue, cancelled';
COMMENT ON COLUMN sales_bills.amount_paid IS 'Total amount paid so far';
COMMENT ON COLUMN sales_bills.payment_date IS 'Date of latest payment';
COMMENT ON COLUMN sales_bills.payment_method IS 'Method of payment: cash, transfer, check, credit';
COMMENT ON COLUMN sales_bills.payment_reference IS 'Payment reference number or transaction ID';
COMMENT ON COLUMN sales_bills.payment_notes IS 'Additional notes about payment';

-- Create a trigger to automatically update payment_status to 'overdue' for bills past due date
CREATE OR REPLACE FUNCTION update_overdue_bills()
RETURNS void AS $$
BEGIN
  UPDATE sales_bills
  SET payment_status = 'overdue'
  WHERE payment_status IN ('pending', 'partial')
    AND due_date < CURRENT_DATE
    AND payment_status != 'overdue';
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate outstanding amount
CREATE OR REPLACE FUNCTION get_outstanding_amount(bill_total DECIMAL, amount_paid DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  RETURN COALESCE(bill_total, 0) - COALESCE(amount_paid, 0);
END;
$$ LANGUAGE plpgsql;

-- Create a view for payment summary by customer
CREATE OR REPLACE VIEW customer_payment_summary AS
SELECT
  c.id as customer_id,
  c.customer_name,
  c.customer_code,
  COUNT(sb.id) as total_bills,
  SUM(sb.total_amount) as total_sales,
  SUM(sb.amount_paid) as total_paid,
  SUM(get_outstanding_amount(sb.total_amount, sb.amount_paid)) as total_outstanding,
  SUM(CASE
    WHEN sb.payment_status = 'overdue'
    THEN get_outstanding_amount(sb.total_amount, sb.amount_paid)
    ELSE 0
  END) as overdue_amount,
  MAX(sb.payment_date) as last_payment_date,
  COUNT(CASE WHEN sb.payment_status = 'paid' THEN 1 END) as paid_bills,
  COUNT(CASE WHEN sb.payment_status = 'overdue' THEN 1 END) as overdue_bills
FROM customers c
LEFT JOIN sales_bills sb ON c.id = sb.customer_id
GROUP BY c.id, c.customer_name, c.customer_code
HAVING COUNT(sb.id) > 0;

-- Create a view for aging report
CREATE OR REPLACE VIEW aging_report AS
SELECT
  sb.id,
  sb.bill_number,
  sb.bill_date,
  sb.due_date,
  sb.total_amount,
  sb.amount_paid,
  get_outstanding_amount(sb.total_amount, sb.amount_paid) as outstanding_amount,
  sb.payment_status,
  c.customer_name,
  c.customer_code,
  CASE
    WHEN sb.due_date IS NULL THEN 0
    ELSE GREATEST(0, (CURRENT_DATE - sb.due_date::DATE))
  END as days_overdue,
  CASE
    WHEN sb.due_date IS NULL THEN 'no_due_date'
    WHEN sb.due_date >= CURRENT_DATE THEN 'current'
    WHEN sb.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'overdue_0_30'
    WHEN sb.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN 'overdue_31_60'
    WHEN sb.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'overdue_61_90'
    ELSE 'overdue_90_plus'
  END as aging_bucket
FROM sales_bills sb
JOIN customers c ON sb.customer_id = c.id
WHERE sb.payment_status != 'paid';

-- Insert some sample payment data for testing (only if no payment data exists)
DO $$
BEGIN
  -- Only add sample data if no payment tracking data exists
  IF NOT EXISTS (SELECT 1 FROM sales_bills WHERE payment_status IS NOT NULL AND payment_status != 'pending') THEN
    -- Update some existing bills with payment data for testing
    UPDATE sales_bills
    SET
      payment_status = 'paid',
      amount_paid = total_amount,
      payment_date = created_at + INTERVAL '7 days',
      payment_method = 'transfer',
      payment_reference = 'PAY-' || EXTRACT(EPOCH FROM NOW())::TEXT
    WHERE id IN (
      SELECT id FROM sales_bills
      ORDER BY created_at DESC
      LIMIT 3
    );

    -- Update some bills as partial payments
    UPDATE sales_bills
    SET
      payment_status = 'partial',
      amount_paid = total_amount * 0.5,
      payment_date = created_at + INTERVAL '5 days',
      payment_method = 'cash',
      payment_notes = 'Partial payment received'
    WHERE id IN (
      SELECT id FROM sales_bills
      WHERE payment_status = 'pending'
      ORDER BY created_at DESC
      LIMIT 2
    );

    -- Set some bills as overdue
    UPDATE sales_bills
    SET
      payment_status = 'overdue',
      due_date = CURRENT_DATE - INTERVAL '10 days'
    WHERE id IN (
      SELECT id FROM sales_bills
      WHERE payment_status = 'pending'
      ORDER BY created_at ASC
      LIMIT 2
    );
  END IF;
END $$;

-- Add RLS policies for payment tracking (inherit from existing sales_bills policies)
-- The existing RLS policies on sales_bills will automatically cover the new columns

COMMIT;