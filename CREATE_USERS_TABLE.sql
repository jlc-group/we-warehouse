-- ========================================
-- CREATE USERS TABLE FOR WAREHOUSE SYSTEM
-- ========================================
--
-- This script creates the users table with proper structure
-- for role-based access control and department management
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard → Your Project → SQL Editor
--
-- ========================================

-- 1. Create users table (if not exists)
CREATE TABLE IF NOT EXISTS public.users (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication & Basic Info
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- For future use (currently demo mode accepts any password)
  full_name TEXT NOT NULL,

  -- Department & Role
  department TEXT NOT NULL DEFAULT 'ทั่วไป',
  role TEXT NOT NULL DEFAULT 'เจ้าหน้าที่',
  role_level INTEGER NOT NULL DEFAULT 2 CHECK (role_level >= 1 AND role_level <= 5),

  -- Employee Details
  employee_code TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,

  -- Status & Tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  notes TEXT
);

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department);
CREATE INDEX IF NOT EXISTS idx_users_role_level ON public.users(role_level);
CREATE INDEX IF NOT EXISTS idx_users_employee_code ON public.users(employee_code);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- 3. Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
-- Policy 1: Allow users to read their own data
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT
  USING (true); -- For now, allow all reads (modify based on your auth setup)

-- Policy 2: Allow users to update their own data
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE
  USING (true) -- For now, allow all updates (modify based on your auth setup)
  WITH CHECK (true);

-- Policy 3: Allow admins to insert new users (level 5)
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT
  WITH CHECK (true); -- For now, allow all inserts (modify based on your auth setup)

-- 7. Create departments reference table (optional but recommended)
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  name_en TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Insert default departments
INSERT INTO public.departments (name, name_en, description) VALUES
  ('คลังสินค้า', 'Warehouse', 'จัดการสต็อกสินค้า รับเข้า-ส่งออก'),
  ('จัดซื้อ', 'Purchasing', 'จัดการ Purchase Orders และซื้อสินค้า'),
  ('การเงิน', 'Finance', 'จัดการใบเสร็จ บัญชี และการเงิน'),
  ('ขาย', 'Sales', 'จัดการออเดอร์ขายและลูกค้า'),
  ('ควบคุมคุณภาพ', 'Quality Control', 'ตรวจสอบคุณภาพสินค้า'),
  ('IT/ระบบ', 'IT/System', 'ดูแลระบบและเทคโนโลยี'),
  ('ผู้บริหาร', 'Executive', 'ผู้บริหารระดับสูง'),
  ('ทั่วไป', 'General', 'แผนกทั่วไป')
ON CONFLICT (name) DO NOTHING;

-- 9. Add comments for documentation
COMMENT ON TABLE public.users IS 'User accounts with role-based access control';
COMMENT ON COLUMN public.users.role_level IS 'Access level: 1=Viewer, 2=Staff, 3=Supervisor, 4=Manager, 5=Admin';
COMMENT ON COLUMN public.users.department IS 'Department name (should match departments table)';
COMMENT ON TABLE public.departments IS 'Department reference table';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these to verify the table was created successfully:

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'users' AND schemaname = 'public';

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'users' AND schemaname = 'public';

-- ========================================
-- SUCCESS!
-- ========================================
-- ✅ Users table created successfully
-- ✅ Departments table created with default data
-- ✅ Indexes created for performance
-- ✅ Triggers set up for updated_at
-- ✅ Row Level Security enabled
--
-- Next step: Run INSERT_SAMPLE_USERS.sql to create test users
-- ========================================
