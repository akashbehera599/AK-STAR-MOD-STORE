import { createClient } from '@supabase/supabase-js';

// Standard Vite environment variables
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

// Exact bucket definitions for AK STAR MOD STORE
export const BUCKETS = {
  APK_FILES: 'apk-files',
  APK_IMAGES: 'apk-images',
  APK_SCREENSHOTS: 'apk-screenshots',
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

