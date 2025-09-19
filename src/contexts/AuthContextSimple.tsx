import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types สำหรับ User
interface User {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: string;
  role_level: number;
  employee_code?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasMinimumRole: (level: number) => boolean;
  isInDepartment: (department: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ตรวจสอบ session ตอน load หน้า
  useEffect(() => {
    const checkSession = () => {
      const userData = localStorage.getItem('warehouse_user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          const normalizedUser = {
            ...parsedUser,
            role: parsedUser.role || 'ผู้ใช้งาน',
            role_level: parsedUser.role_level ?? 1,
            department: parsedUser.department || 'ทั่วไป',
          };
          setUser(normalizedUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('warehouse_user');
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  // Login function ที่ใช้ตาราง users
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      // เรียก function authenticate_user ใน Supabase
      const { data, error } = await supabase.rpc('authenticate_user', {
        user_email: email,
        user_password: password
      });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }

      const userData = data[0];
      const user: User = {
        id: userData.user_id,
        email: userData.email,
        full_name: userData.full_name,
        department: userData.department || 'ทั่วไป',
        role: userData.role || 'ผู้ใช้งาน',
        role_level: userData.role_level ?? 1,
        employee_code: userData.employee_code,
        is_active: userData.is_active
      };

      // เก็บข้อมูล user ใน localStorage และ state
      localStorage.setItem('warehouse_user', JSON.stringify(user));
      setUser(user);

    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const signOut = () => {
    localStorage.removeItem('warehouse_user');
    setUser(null);
  };

  // Permission functions
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Admin ได้ทุกอย่าง
    if (user.role_level >= 5) return true;

    // กำหนด permissions ตาม role_level
    const permissions: Record<number, string[]> = {
      5: ['system.manage', 'users.manage', 'inventory.full', 'reports.all'],
      4: ['department.manage', 'inventory.approve', 'reports.department'],
      3: ['inventory.modify', 'reports.basic', 'team.supervise'],
      2: ['inventory.view', 'inventory.update', 'reports.view'],
      1: ['inventory.view', 'reports.view']
    };

    const userPermissions = permissions[user.role_level] || [];
    return userPermissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const hasMinimumRole = (level: number): boolean => {
    if (!user) return false;
    return user.role_level >= level;
  };

  const isInDepartment = (department: string): boolean => {
    if (!user) return false;
    return user.department === department;
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    hasPermission,
    hasRole,
    hasMinimumRole,
    isInDepartment,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}