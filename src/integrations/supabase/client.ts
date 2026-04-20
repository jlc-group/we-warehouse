/**
 * Supabase Client (compatibility shim)
 *
 * NOTE: This project has fully migrated to Local PostgreSQL (see commit b2b0505).
 * Supabase cloud is no longer used for runtime queries.
 *
 * This file exists only for backward compatibility — any lingering import of
 * `supabase` from `@/integrations/supabase/client` will transparently use the
 * local DB client (`localDb`). No connection to Supabase cloud is ever made.
 *
 * If you are writing new code, import `localDb` directly from
 * `@/integrations/local/client` instead.
 */

import { localDb } from '../local/client';

// Backward-compat: `supabase` is now an alias for `localDb`.
// Casting to `any` preserves the loose typing used by legacy call sites.
export const supabase = localDb as any;

/**
 * Legacy connection check — now probes the local DB backend only.
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await localDb.from('products').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined') {
  console.log('🔍 Database Mode: 🏠 LOCAL PostgreSQL (Supabase cloud disabled)');
}
