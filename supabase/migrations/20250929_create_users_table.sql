-- Create users table for user management
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255), -- For future password management

  -- Profile information
  phone VARCHAR(20),
  avatar_url TEXT,
  employee_code VARCHAR(50),

  -- Department and role
  department_id UUID REFERENCES departments(id),
  role_id UUID REFERENCES roles(id),

  -- Additional role info for compatibility
  department VARCHAR(100) NOT NULL DEFAULT 'ทั่วไป',
  role VARCHAR(100) NOT NULL DEFAULT 'เจ้าหน้าที่',
  role_level INTEGER DEFAULT 3, -- 1=super_admin, 2=manager, 3=supervisor, 4=staff, 5=readonly

  -- Permissions array
  permissions TEXT[] DEFAULT '{"read"}',

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,

  -- Login tracking
  last_login TIMESTAMP WITH TIME ZONE,
  last_login_ip INET,
  login_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT users_role_level_check CHECK (role_level >= 1 AND role_level <= 5)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role_level ON users(role_level);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample users
INSERT INTO users (
  username,
  email,
  full_name,
  department,
  role,
  role_level,
  permissions,
  is_active,
  employee_code,
  last_login
) VALUES
  (
    'admin',
    'admin@company.com',
    'ผู้ดูแลระบบ',
    'ผู้บริหาร',
    'ผู้ดูแลระบบ',
    1,
    '{"read", "write", "delete", "admin"}',
    true,
    'EMP001',
    NOW() - INTERVAL '1 hour'
  ),
  (
    'warehouse_manager',
    'warehouse@company.com',
    'หัวหน้าคลังสินค้า',
    'คลังสินค้า',
    'ผู้จัดการคลัง',
    2,
    '{"read", "write", "inventory_manage"}',
    true,
    'EMP002',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'purchasing_staff',
    'purchasing@company.com',
    'เจ้าหน้าที่จัดซื้อ',
    'จัดซื้อ',
    'เจ้าหน้าที่',
    3,
    '{"read", "write"}',
    true,
    'EMP003',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'qa_staff',
    'qa@company.com',
    'เจ้าหน้าที่ควบคุมคุณภาพ',
    'ควบคุมคุณภาพ',
    'เจ้าหน้าที่',
    4,
    '{"read"}',
    true,
    'EMP004',
    NOW() - INTERVAL '4 hours'
  ),
  (
    'finance_user',
    'finance@company.com',
    'เจ้าหน้าที่การเงิน',
    'การเงิน',
    'เจ้าหน้าที่',
    4,
    '{"read"}',
    false,
    'EMP005',
    NOW() - INTERVAL '5 days'
  ),
  (
    'inventory_staff',
    'inventory@company.com',
    'เจ้าหน้าที่คลังสินค้า',
    'คลังสินค้า',
    'เจ้าหน้าที่',
    4,
    '{"read", "write"}',
    true,
    'EMP006',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (username) DO NOTHING;

-- Add RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Policy: Admins can read all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role_level <= 2  -- Admin or Manager level
      AND is_active = true
    )
  );

-- Policy: Admins can update users
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role_level <= 2  -- Admin or Manager level
      AND is_active = true
    )
  );

-- Policy: Admins can insert new users
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role_level <= 2  -- Admin or Manager level
      AND is_active = true
    )
  );

-- Policy: Only super admins can delete users
CREATE POLICY "Super admins can delete users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role_level = 1  -- Super admin only
      AND is_active = true
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON SEQUENCE users_id_seq TO authenticated;

-- Create a view for user management with joined data
CREATE OR REPLACE VIEW user_management_view AS
SELECT
  u.id,
  u.username,
  u.email,
  u.full_name,
  u.department,
  u.role,
  u.role_level,
  u.permissions,
  u.is_active,
  u.employee_code,
  u.phone,
  u.last_login,
  u.login_count,
  u.created_at,
  u.updated_at,
  d.name_thai as department_thai,
  d.color as department_color,
  r.name_thai as role_thai,
  r.level as role_hierarchy_level
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.role_level ASC, u.full_name ASC;

-- Grant access to the view
GRANT SELECT ON user_management_view TO authenticated;

COMMENT ON TABLE users IS 'User management table for warehouse system';
COMMENT ON COLUMN users.role_level IS 'Role hierarchy: 1=Super Admin, 2=Manager, 3=Supervisor, 4=Staff, 5=Read Only';
COMMENT ON COLUMN users.permissions IS 'Array of permission strings: read, write, delete, admin, inventory_manage';