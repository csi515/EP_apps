import { supabase } from './client';
import type { Database } from './database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 범용 업종/도메인 스키마 클라이언트 (44개 전 업종 스키마 확장 지원).
 * 지정된 스키마에 바인딩된 SupabaseClient 인스턴스를 반환합니다.
 */
export function getIndustryClient<T extends string & keyof Database = string & keyof Database>(
  schema: T
): SupabaseClient<Database, T> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
    );
  }
  return supabase.schema(schema) as unknown as SupabaseClient<Database, T>;
}

/** @deprecated 하위 호환용: getIndustryClient('piano')를 사용하세요. */
export function getPianoClient(): SupabaseClient<Database, 'piano'> {
  return getIndustryClient<'piano'>('piano');
}

/** @deprecated 하위 호환용: getIndustryClient('bath')를 사용하세요. */
export function getBathClient(): SupabaseClient<Database, 'bath'> {
  return getIndustryClient<'bath'>('bath');
}
