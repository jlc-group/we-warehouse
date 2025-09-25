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
    autoRefreshToken: false, // CRITICAL: Disable auto refresh to prevent refresh loops
  },
  // CRITICAL: COMPLETELY DISABLE REALTIME TO PREVENT AUTO-REFRESHES
  realtime: {
    params: {
      eventsPerSecond: 0, // Completely disable events
    },
    // Disable heartbeats and automatic reconnection
    heartbeatIntervalMs: 0,
    reconnectDelayMs: 0,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'warehouse-app@1.0.0',
      'Origin': window.location.origin,
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        mode: 'cors',
        credentials: 'omit',
        // Add cache to prevent unnecessary requests
        cache: 'default',
      });
    },
  },
});
