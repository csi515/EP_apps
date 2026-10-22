/**
 * 동적 직급 권한 키의 매트릭스/사전 가시성.
 * 활성 Capability(프리셋 − hidden)에 없으면 해당 사업장 UI에서 숨긴다.
 */
import type { RolePermissionKey } from './permissions';
import { ROLE_PERMISSION_KEYS } from './permissions';

/** 항상 표시 (인사·위임 코어) */
const ALWAYS_VISIBLE: ReadonlySet<RolePermissionKey> = new Set([
  'members:manage',
  'members_manage',
  'roles:assign',
  'ownership:transfer',
  'policies',
]);

/**
 * 키가 보이려면 activeCapIds에 나열된 capability 중 하나 이상 필요.
 * ALWAYS_VISIBLE 키는 이 맵에 넣지 않는다.
 */
const KEY_REQUIRES_ANY_CAPABILITY: Partial<Record<RolePermissionKey, readonly string[]>> = {
  attendance: ['attendance'],
  booking: ['booking'],
  passes: ['passes'],
  billing_invoices: ['billing', 'billing_invoicing'],
  statistics: ['billing', 'billing_invoicing'],
  seat_room: ['seat_room'],
  rental_equipment: ['rental_equipment'],
  resources_manage: ['booking', 'seat_room', 'rental_equipment'],
  'resources:manage': ['booking', 'seat_room', 'rental_equipment'],
  grievances_manage: ['whistleblower_grievance'],
  'feedbacks:read_all': ['whistleblower_grievance'],
  'shuttle:manage': ['vehicle_shuttle', 'shuttle_dispatch'],
  'volunteer:manage': ['volunteer_activity'],
  'meal_survey:manage': ['meal_survey'],
  'office_supply_request:manage': ['office_supply_request'],
};

export function resolveActiveCapabilityIds(
  activeCapabilities: readonly string[] | null | undefined,
  hiddenCapabilities: readonly string[] | null | undefined = []
): string[] {
  const hidden = new Set(hiddenCapabilities ?? []);
  return (activeCapabilities ?? []).filter((id) => !hidden.has(id));
}

export function isPermissionKeyVisible(
  key: RolePermissionKey | string,
  activeCapIds: readonly string[] | null | undefined
): boolean {
  const typed = key as RolePermissionKey;
  if (ALWAYS_VISIBLE.has(typed)) return true;

  const required = KEY_REQUIRES_ANY_CAPABILITY[typed];
  if (!required || required.length === 0) {
    // 게이트 미선언 키: 카탈로그에만 있고 맵에 없으면 숨기지 않음(안전 기본)
    // ROLE_PERMISSION_KEYS에만 있고 맵에 없는 경우는 항상 표시로 두지 않고, 미등록이면 false로 닫음
    if ((ROLE_PERMISSION_KEYS as readonly string[]).includes(key)) {
      return false;
    }
    return true;
  }

  const active = new Set(activeCapIds ?? []);
  return required.some((capId) => active.has(capId));
}

export function filterPermissionKeysByCapabilities(
  keys: readonly RolePermissionKey[],
  activeCapIds: readonly string[] | null | undefined
): RolePermissionKey[] {
  return keys.filter((key) => isPermissionKeyVisible(key, activeCapIds));
}
