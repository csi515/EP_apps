/**
 * 역할 판정 순수 헬퍼 (UI 플러그인·supabase 비의존).
 * getAllowedTabs 등 UX 가드는 여기 결과를 사용한다.
 */
import type { UserRole } from '@/types';

/** owner/admin/manager/director/super_admin — 사업장 운영 전체 */
export function isOrgAdmin(role: UserRole | string | null | undefined): boolean {
  return (
    role === 'owner' ||
    role === 'director' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'super_admin'
  );
}

/**
 * 최고 관리자 — 모든 기능·직급 플래그를 보유한 것으로 본다.
 * manager는 포함하지 않는다(운영 위임과 구분).
 */
export function isOmnipotentOrgRole(role: UserRole | string | null | undefined): boolean {
  return (
    role === 'owner' ||
    role === 'director' ||
    role === 'admin' ||
    role === 'super_admin'
  );
}

export function isOrgOwner(role: UserRole | string | null | undefined): boolean {
  return role === 'owner' || role === 'director';
}

export function isStaffRole(role: UserRole | string | null | undefined): boolean {
  return role === 'staff' || role === 'instructor' || role === 'driver' || role === 'worker';
}

export function isDriverRole(role: UserRole | string | null | undefined): boolean {
  return role === 'driver';
}

export function isWorkerRole(role: UserRole | string | null | undefined): boolean {
  return role === 'worker';
}

export function isSuperAdminRole(role: UserRole | string | null | undefined): boolean {
  return role === 'super_admin';
}

export function isParentRole(role: UserRole | string | null | undefined): boolean {
  return role === 'parent' || role === 'guardian';
}

/**
 * UX 탭 권한 등급.
 * customer/member/null/unknown → none (admin 폴백 금지)
 */
export type RoleAccessKind = 'admin' | 'staff' | 'parent' | 'none';

export function resolveRoleAccessKind(
  role: UserRole | string | null | undefined
): RoleAccessKind {
  if (isOrgAdmin(role)) return 'admin';
  if (isStaffRole(role)) return 'staff';
  if (isParentRole(role)) return 'parent';
  return 'none';
}
