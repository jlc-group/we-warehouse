// Utility สำหรับจัดการ Authentication ใน Sales System
import { supabase } from '@/integrations/supabase/client';

export interface AuthUser {
  id: string;
  email?: string;
  full_name?: string;
}

// ฟังก์ชันสำหรับดึง user ID ปัจจุบัน
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    // ลองดึงจาก Supabase Auth ก่อน
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      return user.id;
    }

    // ถ้าไม่มี จาก localStorage (สำหรับระบบ demo)
    const userData = localStorage.getItem('warehouse_user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      return parsedUser.id || null;
    }

    // ถ้าไม่มี สร้าง anonymous user ID
    const anonymousId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.warn('🔶 Creating anonymous user ID for demo:', anonymousId);
    return anonymousId;

  } catch (error) {
    console.error('Error getting current user ID:', error);
    // Fallback สำหรับกรณีเกิดข้อผิดพลาด
    return `fallback-${Date.now()}`;
  }
};

// ฟังก์ชันสำหรับดึงข้อมูล user ปัจจุบัน
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  try {
    // ลองดึงจาก Supabase Auth ก่อน
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0]
      };
    }

    // ถ้าไม่มี จาก localStorage (สำหรับระบบ demo)
    const userData = localStorage.getItem('warehouse_user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      return {
        id: parsedUser.id,
        email: parsedUser.email,
        full_name: parsedUser.full_name
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// ฟังก์ชันสำหรับตรวจสอบว่า user มี permission หรือไม่
export const hasPermission = (permission: string): boolean => {
  try {
    const userData = localStorage.getItem('warehouse_user');
    if (!userData) return true; // เปิดให้ใช้งานถ้าไม่มี auth (demo mode)

    const user = JSON.parse(userData);
    const roleLevel = user.role_level || 1;

    // กำหนด permissions ตาม role_level
    const permissions: Record<number, string[]> = {
      5: ['sales.create', 'sales.update', 'sales.delete', 'sales.view'],
      4: ['sales.create', 'sales.update', 'sales.view'],
      3: ['sales.create', 'sales.view'],
      2: ['sales.view'],
      1: ['sales.view']
    };

    const userPermissions = permissions[roleLevel] || ['sales.view'];
    return userPermissions.includes(permission);
  } catch (error) {
    console.error('Error checking permission:', error);
    return true; // Fallback ให้ใช้งานได้
  }
};

// ฟังก์ชันสำหรับ set up default user สำหรับ demo
export const ensureDemoUser = () => {
  const userData = localStorage.getItem('warehouse_user');
  if (!userData) {
    const demoUser = {
      id: `demo-user-${Date.now()}`,
      email: 'demo@warehouse.com',
      full_name: 'ผู้ใช้งานทดสอบ',
      department: 'ขาย',
      role: 'พนักงานขาย',
      role_level: 3,
      is_active: true,
      last_login: new Date().toISOString()
    };

    localStorage.setItem('warehouse_user', JSON.stringify(demoUser));
    console.log('🔧 Demo user created for testing:', demoUser.full_name);
    return demoUser;
  }

  return JSON.parse(userData);
};

export default {
  getCurrentUserId,
  getCurrentUser,
  hasPermission,
  ensureDemoUser
};