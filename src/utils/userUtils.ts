// User utility functions for handling user context and authentication
import { supabase } from '@/integrations/supabase/client';

/**
 * Get current user ID from various sources with proper fallbacks
 * This ensures we always have a valid user ID for system operations
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    // Try to get user from Supabase auth first
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.id) {
      // Check if user exists in public.users table
      const { data: publicUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (publicUser) {
        console.log('🔐 Using authenticated user ID:', user.id);
        return user.id;
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not get authenticated user:', error);
  }

  // Fallback to system user
  const systemUserId = '00000000-0000-0000-0000-000000000000';
  console.log('🔄 Using system user ID as fallback:', systemUserId);
  return systemUserId;
}

/**
 * Get current user ID synchronously (for immediate use)
 * Returns the system user ID as default
 */
export function getCurrentUserIdSync(): string {
  return '00000000-0000-0000-0000-000000000000';
}

/**
 * Ensure user exists in public.users table
 * Creates user if not found
 */
export async function ensureUserExists(userId: string, email?: string, username?: string): Promise<void> {
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email || `user-${userId.slice(0, 8)}@warehouse.local`,
          username: username || `user_${userId.slice(0, 8)}`,
          display_name: username || 'User',
          role: 'user'
        });

      if (error) {
        console.error('❌ Error creating user:', error);
        throw error;
      }

      console.log('✅ Created user in public.users:', userId);
    }
  } catch (error) {
    console.error('❌ Error ensuring user exists:', error);
    throw error;
  }
}

/**
 * Get user-friendly display information for logging
 */
export function getUserDisplayInfo(userId: string): { display: string; type: 'system' | 'authenticated' | 'fallback' } {
  if (userId === '00000000-0000-0000-0000-000000000000') {
    return { display: 'System User', type: 'system' };
  }

  // Try to get user display info
  try {
    // This would need to be async in a real implementation
    return { display: `User ${userId.slice(0, 8)}`, type: 'authenticated' };
  } catch {
    return { display: `Unknown User ${userId.slice(0, 8)}`, type: 'fallback' };
  }
}

/**
 * Validate user ID format
 */
export function isValidUserId(userId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(userId);
}