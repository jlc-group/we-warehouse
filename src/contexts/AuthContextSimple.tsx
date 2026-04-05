import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { localDb } from '@/integrations/local/client';
import { hasPermission as checkPermission } from '@/config/permissions';

// ============== Types ==============
interface UserRole {
  id: string;
  code: string;
  name: string;
}

interface UserDepartment {
  id: string;
  code: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  department: string;       // legacy string
  role: string;             // legacy string
  role_level: number;       // legacy number
  employee_code?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  // New permission system fields
  roles?: UserRole[];
  dept?: UserDepartment | null;
  allowed_pages?: string[];
  username?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
  signOut: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasMinimumRole: (level: number) => boolean;
  isInDepartment: (department: string) => boolean;
  canAccess: (page: string) => boolean;
  getCurrentUserId: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Backend API base URL - derive root from VITE_BACKEND_URL (strip /api/local suffix)
function getBackendRoot(): string {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  if (backendUrl) {
    return backendUrl.replace(/\/api\/local\/?$/, '').replace(/\/api\/?$/, '') || backendUrl;
  }
  // Auto-detect: localhost → direct, external → relative (through Vite proxy)
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3004';
  }
  // External (tunnel) — use empty string so URLs become relative /api/auth/login
  return '';
}
const API_BASE = getBackendRoot();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage
  useEffect(() => {
    const checkSession = () => {
      console.log('🔍 DEBUG [A]: Auth checkSession started');
      const userData = localStorage.getItem('warehouse_user');
      const token = localStorage.getItem('warehouse_token');
      if (userData && token) {
        try {
          const parsedUser = JSON.parse(userData);
          const normalizedUser: User = {
            ...parsedUser,
            role: parsedUser.role || parsedUser.roles?.[0]?.name || 'ผู้ใช้งาน',
            role_level: parsedUser.role_level ?? (parsedUser.roles?.some((r: UserRole) => r.code === 'super_admin') ? 5 : 2),
            department: parsedUser.department || parsedUser.dept?.name || 'ทั่วไป',
          };
          setUser(normalizedUser);
          console.log('✅ User found in localStorage', { userId: normalizedUser.id, role: normalizedUser.role });
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('warehouse_user');
          localStorage.removeItem('warehouse_token');
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  // Login function - tries JWT auth first, falls back to Supabase query
  const signIn = useCallback(async (emailOrUsername: string, password: string) => {
    try {
      setLoading(true);

      console.log('🔐 Authenticating user:', emailOrUsername);

      // Query user from local database directly (no JWT needed)
      const isEmail = emailOrUsername.includes('@');
      let query = localDb
        .from('users')
        .select('*')
        .eq('is_active', true);

      if (isEmail) {
        query = query.eq('email', emailOrUsername);
      } else {
        query = query.eq('username', emailOrUsername);
      }

      const { data: userData, error } = await query.single();

      if (error || !userData) {
        throw new Error('ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง');
      }

      console.log('✅ User found in database (fallback):', userData.full_name);

      const user: User = {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        department: userData.department,
        role: userData.role,
        role_level: userData.role_level,
        employee_code: userData.employee_code || undefined,
        phone: userData.phone || undefined,
        avatar_url: userData.avatar_url || undefined,
        is_active: userData.is_active,
        last_login: new Date().toISOString()
      };

      localStorage.setItem('warehouse_user', JSON.stringify(user));
      setUser(user);

      console.log('🎉 Fallback login successful:', user.full_name, `(${user.role})`);

    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign up function
  const signUp = useCallback(async (email: string, password: string, userData?: any) => {
    try {
      setLoading(true);

      const newUser: User = {
        id: `user-${Date.now()}`,
        email,
        full_name: userData?.full_name || email.split('@')[0],
        department: userData?.department_id || 'ทั่วไป',
        role: 'พนักงาน',
        role_level: 2,
        employee_code: userData?.employee_code || null,
        phone: userData?.phone || null,
        is_active: true,
        last_login: new Date().toISOString()
      };

      localStorage.setItem('warehouse_user', JSON.stringify(newUser));
      setUser(newUser);

    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const signOut = useCallback(() => {
    localStorage.removeItem('warehouse_user');
    localStorage.removeItem('warehouse_token');
    setUser(null);
  }, []);

  // Legacy permission check (by role level)
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    return checkPermission(user.role_level, permission);
  }, [user]);

  // Check if user has a specific role (by role code or legacy role string)
  const hasRole = useCallback((role: string): boolean => {
    if (!user) return false;
    // Check new role system first
    if (user.roles && user.roles.length > 0) {
      return user.roles.some(r => r.code === role || r.name === role);
    }
    // Fallback to legacy
    return user.role === role;
  }, [user]);

  // Check minimum role level
  const hasMinimumRole = useCallback((level: number): boolean => {
    if (!user) return false;
    return user.role_level >= level;
  }, [user]);

  // Check department (new or legacy)
  const isInDepartment = useCallback((department: string): boolean => {
    if (!user) return false;
    // Check new system
    if (user.dept) {
      return user.dept.code === department || user.dept.name === department;
    }
    // Fallback to legacy
    return user.department === department;
  }, [user]);

  // NEW: Page-based access check (like WeOrder's canAccess)
  const canAccess = useCallback((page: string): boolean => {
    if (!user) return false;
    // Super admin / role_level 5 can access everything
    if (user.role_level >= 5) return true;
    if (user.roles?.some(r => r.code === 'super_admin')) return true;
    // Check allowed_pages from JWT
    if (user.allowed_pages && user.allowed_pages.length > 0) {
      return user.allowed_pages.includes(page);
    }
    // Fallback: allow all for legacy users without allowed_pages
    return true;
  }, [user]);

  // Get current user ID with fallback
  const getCurrentUserId = useCallback((): string => {
    if (user?.id) {
      return user.id;
    }
    return '00000000-0000-0000-0000-000000000000';
  }, [user]);

  const value: AuthContextType = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
    hasRole,
    hasMinimumRole,
    isInDepartment,
    canAccess,
    getCurrentUserId,
  }), [user, loading, signIn, signUp, signOut, hasPermission, hasRole, hasMinimumRole, isInDepartment, canAccess, getCurrentUserId]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During HMR, context might be temporarily undefined
    if (import.meta.hot) {
      console.warn('useAuth: Context temporarily undefined during HMR, returning loading state');
      return {
        user: null,
        loading: true,
        signIn: async () => ({ error: null }),
        signUp: async () => ({ error: null }),
        signOut: async () => { },
        hasPermission: () => false,
        hasRole: () => false,
        hasMinimumRole: () => false,
        isInDepartment: () => false,
        canAccess: () => false,
        getCurrentUserId: () => null,
      } as any;
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}