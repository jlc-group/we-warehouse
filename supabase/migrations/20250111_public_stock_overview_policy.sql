-- Enable public access to get_stock_overview RPC function
-- This allows the public Edge Function to call this function without authentication

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION get_stock_overview(UUID) TO anon;

-- Add comment explaining the public access
COMMENT ON FUNCTION get_stock_overview IS
'Public read-only function for stock overview.
Accessible via Edge Function: public-stock-overview.
Returns cached stock data for external consumption (production planning, sales forecasting).';
