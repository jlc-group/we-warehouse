import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  AuthContextType,
  Profile,
  LoginFormData,
  RegisterFormData,
  ProfileUpdateData,
  Department,
  Role,
  PERMISSIONS
} from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user profile with department and role
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          department:departments(*),
          role:roles(*)
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as Profile;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  }, []);

  // Update session tracking
  const updateSession = useCallback(async (userId: string, action: 'start' | 'end') => {
    try {
      if (action === 'start') {
        // Create new session
        await supabase.from('user_sessions').insert({
          user_id: userId,
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent,
        });

        // Update last_login in profile
        await supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId);
      } else {
        // End active sessions
        await supabase
          .from('user_sessions')
          .update({
            session_end: new Date().toISOString(),
            is_active: false
          })
          .eq('user_id', userId)
          .eq('is_active', true);
      }
    } catch (error) {
      console.error('Session update error:', error);
    }
  }, []);

  // Get client IP (fallback implementation)
  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth initialization error:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);

          if (userProfile) {
            await updateSession(session.user.id, 'start');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);

          if (userProfile) {
            await updateSession(session.user.id, 'start');
          }
        } else if (event === 'SIGNED_OUT') {
          if (user) {
            await updateSession(user.id, 'end');
          }
          setUser(null);
          setProfile(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchProfile, updateSession, user]);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      toast({
        title: 'เข้าสู่ระบบสำเร็จ',
        description: 'ยินดีต้อนรับเข้าสู่ระบบจัดการคลังสินค้า',
      });

      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        toast({
          title: 'สมัครสมาชิกไม่สำเร็จ',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      toast({
        title: 'สมัครสมาชิกสำเร็จ',
        description: 'กรุณาตรวจสอบอีเมลเพื่อยืนยันการสมัครสมาชิก',
      });

      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      if (user) {
        await updateSession(user.id, 'end');
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        toast({
          title: 'ออกจากระบบไม่สำเร็จ',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      toast({
        title: 'ออกจากระบบสำเร็จ',
        description: 'ขอบคุณที่ใช้บริการ',
      });
    } catch (error) {
      throw error;
    }
  };

  // Update profile function
  const updateProfile = async (updates: ProfileUpdateData) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Refresh profile
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);

      toast({
        title: 'อัพเดตโปรไฟล์สำเร็จ',
        description: 'ข้อมูลโปรไฟล์ได้รับการอัพเดตแล้ว',
      });
    } catch (error: any) {
      toast({
        title: 'อัพเดตโปรไฟล์ไม่สำเร็จ',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Permission checking functions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!profile?.role?.permissions) return false;
    return profile.role.permissions.includes(permission);
  }, [profile]);

  const hasRole = useCallback((roleName: string): boolean => {
    if (!profile?.role) return false;
    return profile.role.name === roleName;
  }, [profile]);

  const hasMinimumRole = useCallback((level: number): boolean => {
    if (!profile?.role) return false;
    return profile.role.level >= level;
  }, [profile]);

  const isInDepartment = useCallback((departmentName: string): boolean => {
    if (!profile?.department) return false;
    return profile.department.name === departmentName;
  }, [profile]);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
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

export { AuthContext };