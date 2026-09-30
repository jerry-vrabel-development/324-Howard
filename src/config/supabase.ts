/**
 * Supabase connection. Both values are public by design: the publishable key
 * only identifies the app, and every permission is enforced by Row Level
 * Security in the database (see supabase/migrations/0001_init.sql).
 *
 * NEVER put the secret key (sb_secret_…) or the legacy service_role key here.
 *
 * Override with VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY, or set
 * VITE_DATA_MODE=local to run entirely in the browser without Supabase.
 */
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://kczpsdqblrmblikrhyvn.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4p_iwDvWfSn9ixCOszQNEw_Po44q5mp';

export const DATA_MODE: 'local' | 'remote' =
  import.meta.env.VITE_DATA_MODE === 'local' ? 'local' : 'remote';

export const PHOTO_BUCKET = 'photos';
