import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  // TEMPORARILY DISABLE REALTIME TO FIX WEBSOCKET CONFLICTS
  // realtime: {
  //   params: {
  //     eventsPerSecond: 1,
  //   },
  // },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'warehouse-app@1.0.0',
    },
  },
});
