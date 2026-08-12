import { createClient } from '@supabase/supabase-js';

// Support both VITE_ and NEXT_PUBLIC_ prefixes
const supabaseUrl = 
  (import.meta.env.VITE_SUPABASE_URL as string) || 
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string) || 
  (typeof process !== 'undefined' ? (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) : '') || 
  'https://YOUR_SUPABASE_PROJECT.supabase.co';

const supabaseAnonKey = 
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 
  (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || 
  (typeof process !== 'undefined' ? (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) : '') || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const BUCKETS = {
  APK_ASSETS: 'apk-assets',
  PAYMENT_PROOFS: 'payment-proofs',
  STORE_ASSETS: 'store-assets',
} as const;

export function isSupabaseConfigured(): boolean {
  const url = 
    (import.meta.env.VITE_SUPABASE_URL as string) || 
    (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string) || '';
  const key = 
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 
    (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || '';

  return Boolean(
    url && 
    key && 
    !url.includes('YOUR_SUPABASE_PROJECT') && 
    !key.includes('dummy_anon_key')
  );
}
