import type { User } from '@supabase/supabase-js';

/**
 * 슈퍼 관리자(최고 개발자/운영자) 여부를 판별합니다.
 *
 * 판별 기준:
 * 1. user.app_metadata.is_super_admin === true
 * 2. user.user_metadata.is_super_admin === true
 * 3. user.app_metadata.role === 'super_admin'
 * 4. 이메일이 @moa-admin.internal 또는 기본 최고관리자 목록에 속함
 * 5. 로컬 개발/스테이징 오버라이드 플래그
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;

  // 1. App Metadata 플래그
  if (user.app_metadata?.is_super_admin === true) return true;
  if (user.app_metadata?.role === 'super_admin') return true;

  // 2. User Metadata 플래그
  if (user.user_metadata?.is_super_admin === true) return true;

  // 3. 관리자 전용 도메인 또는 사전 정의된 관리자 이메일
  const email = (user.email || '').toLowerCase().trim();
  if (email.endsWith('@moa-admin.internal')) return true;

  const DEFAULT_SUPER_ADMIN_EMAILS = [
    'admin@moa.io',
    'superadmin@moa.io',
    'developer@moa.io',
    'master@moa.io',
  ];
  if (DEFAULT_SUPER_ADMIN_EMAILS.includes(email)) return true;

  // 4. 로컬/테스트 환경 오버라이드 (개발자 편의 및 E2E 테스트용)
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage.getItem('moa_super_admin_override') === 'true') {
        return true;
      }
    } catch {
      // ignore
    }
  }

  return false;
}
