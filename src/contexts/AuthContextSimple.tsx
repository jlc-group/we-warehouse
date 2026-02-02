import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { hasPermission as checkPermission } from '@/config/permissions';

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
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
  signOut: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasMinimumRole: (level: number) => boolean;
  isInDepartment: (department: string) => boolean;
  getCurrentUserId: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ตรวจสอบ session ตอน load หน้า
  useEffect(() => {
    const checkSession = () => {
      console.log('🔍 DEBUG [A]: Auth checkSession started', { hasLocalStorage: !!localStorage.getItem('warehouse_user') });
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
          console.log('✅ User found in localStorage', { userId: normalizedUser.id, role: normalizedUser.role });
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('warehouse_user');
        }
      }
      console.log('🔍 DEBUG [A]: Auth checkSession completed, setting loading=false', { hasUser: !!userData });
      setLoading(false);
    };

    checkSession();
  }, []);

  // Login function ที่เชื่อมต่อกับ Supabase Database
  const signIn = useCallback(async (emailOrUsername: string, password: string) => {
    try {
      setLoading(true);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔐 Authenticating user:', emailOrUsername);

      // Check if input is email or username
      const isEmail = emailOrUsername.includes('@');

      // Query user from Supabase users table - support both email and username
      let query = supabase
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
        console.error('❌ User not found or inactive:', error?.message);
        throw new Error('ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง');
      }

      // For demo purposes, we'll accept any password for existing users
      // In production, you would verify password_hash with bcrypt
      // const bcrypt = require('bcryptjs');
      // const isValidPassword = await bcrypt.compare(password, userData.password_hash);

      console.log('✅ User found in database:', userData.full_name);

      // Transform database user to application user format
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

      // Update last_login in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id);

      if (updateError) {
        console.warn('⚠️ Failed to update last_login:', updateError.message);
      }

      // เก็บข้อมูル user ใน localStorage และ state
      localStorage.setItem('warehouse_user', JSON.stringify(user));
      setUser(user);

      console.log('🎉 Login successful:', user.full_name, `(${user.role})`);
      return;

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

      // For demo purposes, we'll simulate signup
      // In a real app, this would create a Supabase user and profile
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

      // Save to localStorage (in real app, would be saved to Supabase)
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
    setUser(null);
  }, []);

  // Permission functions with memoization
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    return checkPermission(user.role_level, permission);
  }, [user]);

  const hasRole = useCallback((role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  }, [user]);

  const hasMinimumRole = useCallback((level: number): boolean => {
    if (!user) return false;
    return user.role_level >= level;
  }, [user]);

  const isInDepartment = useCallback((department: string): boolean => {
    if (!user) return false;
    return user.department === department;
  }, [user]);

  // Get current user ID with fallback
  const getCurrentUserId = useCallback((): string => {
    if (user?.id) {
      return user.id;
    }
    // Fallback to system user ID
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
    getCurrentUserId,
  }), [user, loading, signIn, signUp, signOut, hasPermission, hasRole, hasMinimumRole, isInDepartment, getCurrentUserId]);

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
    // Return a loading state instead of throwing to prevent crashes
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
        getCurrentUserId: () => null,
      } as any;
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}