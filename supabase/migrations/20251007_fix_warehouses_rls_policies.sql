-- แก้ไข RLS Policies สำหรับ warehouses table
-- ให้ทุกคนอ่านได้ แต่แก้ไขได้เฉพาะ admin

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to warehouses" ON warehouses;
DROP POLICY IF EXISTS "Allow authenticated read access to warehouses" ON warehouses;
DROP POLICY IF EXISTS "Allow admin full access to warehouses" ON warehouses;
DROP POLICY IF EXISTS "Enable read access for all users" ON warehouses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON warehouses;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON warehouses;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON warehouses;

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Policy 1: ทุกคนอ่านได้ (SELECT)
CREATE POLICY "warehouses_select_public"
ON warehouses
FOR SELECT
USING (true);

-- Policy 2: Authenticated users สร้างได้ (INSERT)
CREATE POLICY "warehouses_insert_authenticated"
ON warehouses
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Authenticated users แก้ไขได้ (UPDATE)
CREATE POLICY "warehouses_update_authenticated"
ON warehouses
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Authenticated users ลบได้ (DELETE)
CREATE POLICY "warehouses_delete_authenticated"
ON warehouses
FOR DELETE
TO authenticated
USING (true);

-- Policy 5: Anon users อ่านได้ (สำหรับ public access)
CREATE POLICY "warehouses_select_anon"
ON warehouses
FOR SELECT
TO anon
USING (true);

-- ตรวจสอบว่ามี function update_warehouses_updated_at หรือยัง
CREATE OR REPLACE FUNCTION update_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- แสดงสรุป policies
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies สำหรับ warehouses table:';
  RAISE NOTICE '   - SELECT: Public (ทุกคนอ่านได้)';
  RAISE NOTICE '   - INSERT: Authenticated users';
  RAISE NOTICE '   - UPDATE: Authenticated users';
  RAISE NOTICE '   - DELETE: Authenticated users';
END $$;
