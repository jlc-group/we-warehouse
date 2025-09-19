-- ==========================================
-- สร้างระบบ Authentication แบบมาตรฐานภายใน
-- สำหรับระบบจัดการคลังสินค้า
-- ==========================================

-- ลบตารางเก่า (ถ้ามี)
DROP TABLE IF EXISTS public.user_sessions;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.departments;
DROP TABLE IF EXISTS public.roles;

-- สร้างตาราง users แบบมาตรฐาน
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- เก็บรหัสผ่านแบบ hash
    full_name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'คลังสินค้า',
    role TEXT NOT NULL DEFAULT 'พนักงาน',
    role_level INTEGER NOT NULL DEFAULT 2, -- 1=Read-only, 2=Staff, 3=Supervisor, 4=Manager, 5=Admin
    employee_code TEXT UNIQUE,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง index สำหรับ performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_employee_code ON public.users(employee_code);
CREATE INDEX idx_users_department ON public.users(department);
CREATE INDEX idx_users_role_level ON public.users(role_level);

-- Enable password hashing extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function สำหรับสร้าง hash password
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- Function สำหรับตรวจสอบ password
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;

-- Function สำหรับ authentication
CREATE OR REPLACE FUNCTION public.authenticate_user(user_email TEXT, user_password TEXT)
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    full_name TEXT,
    department TEXT,
    role TEXT,
    role_level INTEGER,
    employee_code TEXT,
    is_active BOOLEAN
) AS $$
DECLARE
    user_record public.users%ROWTYPE;
BEGIN
    -- ดึงข้อมูล user
    SELECT * INTO user_record
    FROM public.users
    WHERE users.email = user_email
    AND users.is_active = TRUE;

    -- ตรวจสอบว่าพบ user หรือไม่
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- ตรวจสอบว่า account ถูก lock หรือไม่
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
        RETURN;
    END IF;

    -- ตรวจสอบ password
    IF verify_password(user_password, user_record.password_hash) THEN
        -- Password ถูกต้อง - reset login attempts และ update last_login
        UPDATE public.users
        SET
            login_attempts = 0,
            locked_until = NULL,
            last_login = NOW()
        WHERE id = user_record.id;

        -- Return user data
        RETURN QUERY
        SELECT
            user_record.id,
            user_record.email,
            user_record.full_name,
            user_record.department,
            user_record.role,
            user_record.role_level,
            user_record.employee_code,
            user_record.is_active;
    ELSE
        -- Password ผิด - เพิ่ม login attempts
        UPDATE public.users
        SET
            login_attempts = login_attempts + 1,
            locked_until = CASE
                WHEN login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
                ELSE NULL
            END
        WHERE id = user_record.id;

        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ใส่ข้อมูล admin และ users ตัวอย่าง
INSERT INTO public.users (
    email,
    password_hash,
    full_name,
    department,
    role,
    role_level,
    employee_code,
    is_active
) VALUES
-- Admin user
(
    'admin@warehouse.local',
    hash_password('Admin123!'),
    'System Administrator',
    'ผู้บริหาร',
    'ผู้ดูแลระบบ',
    5,
    'ADMIN001',
    true
),
-- Manager user
(
    'manager@warehouse.local',
    hash_password('Manager123!'),
    'Warehouse Manager',
    'คลังสินค้า',
    'ผู้จัดการ',
    4,
    'MGR001',
    true
),
-- Staff user
(
    'staff@warehouse.local',
    hash_password('Staff123!'),
    'Warehouse Staff',
    'คลังสินค้า',
    'พนักงาน',
    2,
    'STF001',
    true
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own data + admins can view all
CREATE POLICY "Users can view own data" ON public.users
FOR SELECT USING (true); -- สำหรับใช้งานภายใน ให้ดูได้ทุกคน

-- Function สำหรับ updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger สำหรับ updated_at
CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ตรวจสอบผลลัพธ์
SELECT
    'SUCCESS: Created users table with ' || COUNT(*) || ' users' as result
FROM public.users;

-- แสดงข้อมูล users ที่สร้างไว้
SELECT
    email,
    full_name,
    department,
    role,
    role_level,
    employee_code,
    is_active,
    created_at
FROM public.users
ORDER BY role_level DESC;