-- 🚀 รันใน Supabase Dashboard → SQL Editor → กด "Run" ทันที!

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

GRANT EXECUTE ON FUNCTION execute_sql(text) TO public;

-- ✅ เสร็จแล้ว! กลับไปที่แอป → แท็บ "ตำแหน่ง" ระบบจะทำงานทันที!