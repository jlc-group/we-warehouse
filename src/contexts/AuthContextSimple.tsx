import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
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
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
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

  // Login function ที่เชื่อมต่อกับ Supabase Database
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔐 Authenticating user:', email);

      // Query user from Supabase users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error || !userData) {
        console.error('❌ User not found or inactive:', error?.message);
        throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
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

    // Import permission system
    const { hasPermission: checkPermission } = require('@/config/permissions');
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
  }), [user, loading, signIn, signUp, signOut, hasPermission, hasRole, hasMinimumRole, isInDepartment]);

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