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
      'Connection': 'close', // Force HTTP/1.1 to avoid QUIC protocol errors
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        mode: 'cors',
        credentials: 'omit',
        // Force HTTP/1.1 to prevent QUIC protocol errors
        cache: 'no-store', // Changed from 'default' to prevent caching issues
        // Add retry logic for failed requests
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }).catch(async (error) => {
        // Retry logic for network errors
        if (error.name === 'AbortError' || error.message.includes('QUIC') || error.message.includes('net::ERR')) {
          console.warn('Network error detected, retrying with fallback...', error.message);
          // Retry with simpler fetch
          return fetch(url, {
            ...options,
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-store',
            headers: {
              ...options.headers,
              'Connection': 'close',
              'Cache-Control': 'no-cache',
            },
          });
        }
        throw error;
      });
    },
  },
});
