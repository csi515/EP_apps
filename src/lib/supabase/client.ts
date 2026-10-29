import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { dynamicAuthStorage } from '@/core/auth/services/authStorage';
import { isLocalAuthEnabled } from '@/core/auth/localAuth/isLocalAuth';
import { getLocalAuthToken } from '@/core/auth/localAuth/localSessionStore';

import { createLogger } from '@/core/logging';

const logger = createLogger('SupabaseClient');

const defaultUrl = 'https://mock-supabase.moa.local';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock-anon-key';

const isProd = Boolean(import.meta.env?.PROD);
const hasEnvConfig = Boolean(import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY);

if (isProd && !hasEnvConfig) {
  logger.error(
    'Critical: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in production environment.'
  );
}

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || defaultKey;

/** 로컬 Auth JWT를 PostgREST(Authorization)에 주입 — anon key를 덮어쓴다 */
function corpDomainFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!isLocalAuthEnabled()) {
    return fetch(input, init);
  }
  const headers = new Headers(init?.headers);
  // Request 객체로 호출된 경우 init.headers에 Authorization이 없을 수 있음
  if (input instanceof Request) {
    input.headers.forEach((value, key) => {
      if (!headers.has(key)) headers.set(key, value);
    });
  }
  const token = getLocalAuthToken();
  if (token) {
    // supabase-js 기본 Authorization(anon key)을 로컬 JWT로 교체
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

/** Supabase 클라이언트 (core 스키마 기본) */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: dynamicAuthStorage,
    },
    db: {
      schema: 'core',
    },
    global: {
      fetch: corpDomainFetch,
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
