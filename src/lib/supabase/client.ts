import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const defaultUrl = 'https://mock-supabase.moa.local';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock-anon-key';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || defaultKey;

/** Supabase 클라이언트 (core 스키마 기본) */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'core',
    },
  }
);

/** Supabase 연결 가능 여부 */
export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY);
}

/** core 스키마 클라이언트 (타입 안전) */
export function getCoreClient(): SupabaseClient<Database, 'core'> {
  return supabase as SupabaseClient<Database, 'core'>;
}
