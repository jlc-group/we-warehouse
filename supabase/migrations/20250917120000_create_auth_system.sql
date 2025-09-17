-- ==========================================
-- Phase 1: Authentication & Role System
-- Create user profiles, departments, and roles
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    name_thai TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    name_thai TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    level INTEGER NOT NULL DEFAULT 1, -- 1=Staff, 2=Supervisor, 3=Manager, 4=Admin
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    department_id UUID REFERENCES public.departments(id),
    role_id UUID REFERENCES public.roles(id),
    employee_code TEXT UNIQUE,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user sessions tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Insert default departments
INSERT INTO public.departments (name, name_thai, description, color) VALUES
('warehouse', 'คลังสินค้า', 'พนักงานคลังสินค้าและการจัดเก็บ', '#10b981'),
('procurement', 'จัดซื้อ', 'แผนกจัดซื้อและจัดหา', '#f59e0b'),
('quality_control', 'ควบคุมคุณภาพ', 'แผนกควบคุมคุณภาพและตรวจสอบ', '#8b5cf6'),
('finance', 'การเงิน', 'แผนกการเงินและบัญชี', '#ef4444'),
('management', 'ผู้บริหาร', 'ผู้บริหารและผู้จัดการ', '#1e40af')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles
INSERT INTO public.roles (name, name_thai, description, level, permissions) VALUES
('super_admin', 'ผู้ดูแลระบบ', 'ผู้ดูแลระบบระดับสูงสุด', 5, '["system.manage", "users.manage", "inventory.full", "reports.all"]'),
('manager', 'ผู้จัดการ', 'ผู้จัดการแผนก', 4, '["department.manage", "inventory.approve", "reports.department"]'),
('supervisor', 'หัวหน้างาน', 'หัวหน้างานระดับกลาง', 3, '["inventory.modify", "reports.basic", "team.supervise"]'),
('staff', 'พนักงาน', 'พนักงานทั่วไป', 2, '["inventory.view", "inventory.update", "reports.view"]'),
('readonly', 'อ่านอย่างเดียว', 'สิทธิ์ดูข้อมูลเท่านั้น', 1, '["inventory.view", "reports.view"]')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_code ON public.profiles(employee_code);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Departments: Everyone can read, only admins can modify
DROP POLICY IF EXISTS "Enable read access for departments" ON public.departments;
CREATE POLICY "Enable read access for departments"
ON public.departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable write for admin departments" ON public.departments;
CREATE POLICY "Enable write for admin departments"
ON public.departments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role_id IN (
            SELECT id FROM public.roles
            WHERE name IN ('super_admin', 'manager')
        )
    )
);

-- Roles: Everyone can read, only super_admin can modify
DROP POLICY IF EXISTS "Enable read access for roles" ON public.roles;
CREATE POLICY "Enable read access for roles"
ON public.roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable write for admin roles" ON public.roles;
CREATE POLICY "Enable write for admin roles"
ON public.roles FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role_id IN (
            SELECT id FROM public.roles
            WHERE name = 'super_admin'
        )
    )
);

-- Profiles: Users can read their own and department colleagues
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role_id IN (
            SELECT id FROM public.roles
            WHERE name IN ('super_admin', 'manager', 'supervisor')
        )
    )
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User sessions: Users can only see their own sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;
CREATE POLICY "Users can insert own sessions"
ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_departments_updated_at ON public.departments;
CREATE TRIGGER handle_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_roles_updated_at ON public.roles;
CREATE TRIGGER handle_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create function to automatically create profile on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Verify the setup
SELECT
    'SUCCESS: Auth system tables created with ' ||
    (SELECT COUNT(*) FROM public.departments) || ' departments and ' ||
    (SELECT COUNT(*) FROM public.roles) || ' roles' as result;