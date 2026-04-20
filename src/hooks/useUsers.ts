import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/integrations/local/client';
import { useToast } from '@/hooks/use-toast';

// User interface matching actual database schema
export interface User {
  id: string;
  email: string;
  password_hash?: string;
  full_name: string;
  department: string;
  role: string;
  role_level: number;
  employee_code?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  login_attempts?: number;
  locked_until?: string;
  created_at: string;
  updated_at: string;
}

export interface UserInsert {
  email: string;
  password_hash?: string;
  full_name: string;
  department: string;
  role: string;
  role_level: number;
  employee_code?: string;
  phone?: string;
  avatar_url?: string;
  is_active?: boolean;
}

export interface UserUpdate {
  email?: string;
  password_hash?: string;
  full_name?: string;
  department?: string;
  role?: string;
  role_level?: number;
  employee_code?: string;
  phone?: string;
  avatar_url?: string;
  is_active?: boolean;
}

// Hook for fetching all users
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      console.log('🔍 Fetching users from database...');

      try {
        const { data, error } = await localDb
          .from('users')
          .select('*')
          .order('role_level', { ascending: true });

        if (error) {
          console.error('❌ Error fetching users:', error);

          // Provide more helpful error messages
          if (error.code === '42P01') {
            throw new Error('ตาราง users ไม่พบ - กรุณาเรียกใช้ migration ก่อน');
          } else if (error.code === '42501') {
            throw new Error('ไม่มีสิทธิ์เข้าถึงตาราง users - กรุณาตรวจสอบ RLS policies');
          } else if (error.message.includes('row-level security')) {
            throw new Error('RLS policies กำลังป้องกันการเข้าถึง - กรุณารัน fix_users_rls.sql');
          }

          throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
        }

        console.log('✅ Fetched users from table:', data?.length || 0);
        console.log('📋 Users data preview:', data?.slice(0, 2));
        return (data || []) as User[];

      } catch (error: any) {
        console.error('❌ Failed to fetch users:', error);

        // Re-throw with better error message
        if (error.message) {
          throw error;
        } else {
          throw new Error('ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้');
        }
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: false, // Disable auto refetch for now
    retry: (failureCount, error: any) => {
      // Don't retry on permission errors
      if (error?.message?.includes('RLS') || error?.message?.includes('permission')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Hook for fetching single user
export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async (): Promise<User | null> => {
      console.log('🔍 Fetching user by ID:', userId);

      try {
        const { data, error } = await localDb
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Not found
            return null;
          }
          throw error;
        }

        return data as User;
      } catch (error) {
        console.error('❌ Failed to fetch user:', error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for creating users
export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userData: UserInsert): Promise<User> => {
      console.log('➕ Creating new user:', userData.email);

      const { data, error } = await localDb
        .from('users')
        .insert({
          ...userData,
          password_hash: userData.password_hash || 'temp_password_hash',
          is_active: userData.is_active !== undefined ? userData.is_active : true,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating user:', error);
        throw error;
      }

      return data as User;
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'สร้างผู้ใช้สำเร็จ',
        description: `เพิ่มผู้ใช้ ${newUser.full_name} เรียบร้อยแล้ว`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถสร้างผู้ใช้ได้: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook for updating users
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: UserUpdate }): Promise<User> => {
      console.log('✏️ Updating user:', userId, updates);

      const { data, error } = await localDb
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating user:', error);
        throw error;
      }

      return data as User;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] });
      toast({
        title: 'อัปเดตผู้ใช้สำเร็จ',
        description: `อัปเดตข้อมูล ${updatedUser.full_name} เรียบร้อยแล้ว`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถอัปเดตผู้ใช้ได้: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook for deleting users
export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      console.log('🗑️ Deleting user:', userId);

      const { error } = await localDb
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('❌ Error deleting user:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'ลบผู้ใช้สำเร็จ',
        description: 'ลบผู้ใช้ออกจากระบบเรียบร้อยแล้ว',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถลบผู้ใช้ได้: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook for toggling user status
export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }): Promise<User> => {
      console.log('🔄 Toggling user status:', userId, isActive);

      const { data, error } = await localDb
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error toggling user status:', error);
        throw error;
      }

      return data as User;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] });
      toast({
        title: updatedUser.is_active ? 'เปิดใช้งานผู้ใช้' : 'ปิดใช้งานผู้ใช้',
        description: `${updatedUser.full_name} ถูก${updatedUser.is_active ? 'เปิด' : 'ปิด'}ใช้งานแล้ว`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถเปลี่ยนสถานะผู้ใช้ได้: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook for updating last login
export function useUpdateLastLogin() {
  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      console.log('🔄 Updating last login for user:', userId);

      const { error } = await localDb
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          login_attempts: 0,
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error updating last login:', error);
        throw error;
      }
    },
  });
}

// Utility functions
export const getUserRoleColor = (roleLevel: number) => {
  switch (roleLevel) {
    case 1: return 'bg-red-100 text-red-800'; // Super Admin
    case 2: return 'bg-blue-100 text-blue-800'; // Manager
    case 3: return 'bg-green-100 text-green-800'; // Supervisor
    case 4: return 'bg-yellow-100 text-yellow-800'; // Staff
    case 5: return 'bg-gray-100 text-gray-800'; // Read Only
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getPermissionLabels = (roleLevel: number) => {
  switch (roleLevel) {
    case 1: return ['ผู้ดูแล', 'อ่าน', 'เขียน', 'ลบ'];
    case 2: return ['อ่าน', 'เขียน', 'จัดการคลัง'];
    case 3: return ['อ่าน', 'เขียน'];
    case 4: return ['อ่าน'];
    case 5: return ['อ่าน'];
    default: return ['อ่าน'];
  }
};

export const getDepartments = () => [
  'ผู้บริหาร',
  'คลังสินค้า',
  'จัดซื้อ',
  'ควบคุมคุณภาพ',
  'การเงิน',
  'ทั่วไป'
];

export const getRoles = () => [
  'ผู้ดูแลระบบ',
  'ผู้จัดการคลัง',
  'หัวหน้าแผนก',
  'เจ้าหน้าที่',
  'ผู้อ่านอย่างเดียว'
];