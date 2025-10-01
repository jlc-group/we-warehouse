import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log environment variables (safely)
console.log('🔍 Supabase Config Check:', {
  url: supabaseUrl ? '✅ Present' : '❌ Missing',
  key: supabaseAnonKey ? `✅ Present (${supabaseAnonKey.substring(0, 20)}...)` : '❌ Missing',
  env: import.meta.env.MODE
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Available env keys:', Object.keys(import.meta.env));
  throw new Error('Missing Supabase environment variables');
}

// Exponential backoff retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function exponentialBackoff(attempt: number): Promise<void> {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Connection health check
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
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
    },
    fetch: async (url, options = {}) => {
      let lastError: Error | null = null;

      // Silent mode - only log on errors
      // if (import.meta.env.MODE === 'development' && url.includes('/rest/v1/')) {
      //   console.log('🔧 Supabase Request Debug:', {
      //     url: url.substring(0, 80) + '...',
      //     hasHeaders: !!options.headers,
      //     headerType: options.headers instanceof Headers ? 'Headers object' : typeof options.headers,
      //     apikey: options.headers instanceof Headers
      //       ? options.headers.get('apikey')?.substring(0, 20) + '...'
      //       : (options.headers as any)?.apikey?.substring(0, 20) + '...'
      //   });
      // }

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

          // CRITICAL: Preserve all headers from Supabase (including apikey)
          // Don't override or spread - just pass through with minimal additions
          const fetchOptions: RequestInit = {
            ...options,
            signal: controller.signal,
            cache: 'no-store',
          };

          // Only add headers if not already present
          if (options.headers instanceof Headers) {
            // Clone existing Headers object
            const headers = new Headers(options.headers);
            headers.set('Connection', 'close');
            headers.set('Cache-Control', 'no-cache');
            fetchOptions.headers = headers;
          } else if (typeof options.headers === 'object') {
            // Merge plain object headers
            fetchOptions.headers = {
              ...options.headers,
              'Connection': 'close',
              'Cache-Control': 'no-cache',
            };
          }

          const response = await fetch(url, fetchOptions);

          clearTimeout(timeoutId);
          return response;

        } catch (error: any) {
          lastError = error;
          const isRetryableError =
            error.name === 'AbortError' ||
            error.message?.includes('QUIC') ||
            error.message?.includes('net::ERR') ||
            error.message?.includes('fetch failed');

          if (isRetryableError && attempt < MAX_RETRIES - 1) {
            console.warn(`Network error on attempt ${attempt + 1}/${MAX_RETRIES}, retrying...`, error.message);
            await exponentialBackoff(attempt);
            continue;
          }

          throw error;
        }
      }

      throw lastError || new Error('Max retries exceeded');
    },
  },
});
