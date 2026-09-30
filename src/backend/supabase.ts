import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PHOTO_BUCKET, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config/supabase';

let client: SupabaseClient | undefined;

export function supabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Sign-in links return with the session in the URL. The implicit flow works even when
      // the email is opened on a different device from the one that asked for it.
      flowType: 'implicit',
      detectSessionInUrl: true,
    },
  });
  return client;
}

/** Storage paths become public URLs; full URLs (imported from the old version) pass through. */
export function photoUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return supabase().storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Throws a readable error for a failed Supabase call. */
export function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
