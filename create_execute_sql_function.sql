-- Create execute_sql RPC function for dynamic SQL execution
-- Run this in Supabase SQL Editor first

CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN 'Success';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Grant execute permission to public (since we use custom auth)
GRANT EXECUTE ON FUNCTION execute_sql(text) TO public;