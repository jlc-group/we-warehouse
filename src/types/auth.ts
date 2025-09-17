export interface Department {
  id: string;
  name: string;
  name_thai: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  name_thai: string;
  description?: string;
  permissions: string[];
  level: number; // 1=Staff, 2=Supervisor, 3=Manager, 4=Admin, 5=Super Admin
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  department_id?: string;
  role_id?: string;
  employee_code?: string;
  phone?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  // Relations
  department?: Department;
  role?: Role;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_start: string;
  session_end?: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
}

// Permission constants
export const PERMISSIONS = {
  // System permissions
  SYSTEM_MANAGE: 'system.manage',
  USERS_MANAGE: 'users.manage',

  // Inventory permissions
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_UPDATE: 'inventory.update',
  INVENTORY_MODIFY: 'inventory.modify',
  INVENTORY_APPROVE: 'inventory.approve',
  INVENTORY_FULL: 'inventory.full',

  // Report permissions
  REPORTS_VIEW: 'reports.view',
  REPORTS_BASIC: 'reports.basic',
  REPORTS_DEPARTMENT: 'reports.department',
  REPORTS_ALL: 'reports.all',

  // Team permissions
  TEAM_SUPERVISE: 'team.supervise',
  DEPARTMENT_MANAGE: 'department.manage',
} as const;

// Role levels
export const ROLE_LEVELS = {
  READONLY: 1,
  STAFF: 2,
  SUPERVISOR: 3,
  MANAGER: 4,
  SUPER_ADMIN: 5,
} as const;

// Department types
export const DEPARTMENT_TYPES = {
  WAREHOUSE: 'warehouse',
  PROCUREMENT: 'procurement',
  QUALITY_CONTROL: 'quality_control',
  FINANCE: 'finance',
  MANAGEMENT: 'management',
} as const;

// Auth context type
export interface AuthContextType {
  user: any | null; // Supabase User
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData?: any) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasMinimumRole: (level: number) => boolean;
  isInDepartment: (department: string) => boolean;
}

// Login form types
export interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  employee_code?: string;
  phone?: string;
  department_id?: string;
  role_id?: string;
}

// Profile update types
export interface ProfileUpdateData {
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  employee_code?: string;
}

// Department stats for dashboard
export interface DepartmentStats {
  department: Department;
  user_count: number;
  active_sessions: number;
  last_activity?: string;
}