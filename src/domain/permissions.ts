/** 사업주가 저장한 직급 권한(JSONB boolean) 판정. */

export const ROLE_PERMISSION_KEYS = [
  'billing_invoices',
  'attendance',
  'booking',
  'passes',
  'statistics',
  'members_manage',
  'policies',
  'resources_manage',
  'grievances_manage',
] as const;

export type RolePermissionKey = (typeof ROLE_PERMISSION_KEYS)[number];

export type RolePermissionMap = Record<RolePermissionKey, boolean>;

export const EMPTY_ROLE_PERMISSIONS: RolePermissionMap = {
  billing_invoices: false,
  attendance: true,
  booking: true,
  passes: true,
  statistics: false,
  members_manage: false,
  policies: false,
  resources_manage: false,
  grievances_manage: false,
};

export type AccessMember = {
  role?: string | null;
  customRole?: { permissions?: RolePermissionMap | Record<string, boolean> | null } | null;
};

/** 누락 키는 false(또는 EMPTY 기본값)로 채운다. 구버전 역할 JSON 호환. */
export function normalizeRolePermissions(value: unknown): RolePermissionMap | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const hasAnyKnown = ROLE_PERMISSION_KEYS.some((key) => typeof obj[key] === 'boolean');
  if (!hasAnyKnown) return null;
  const next = { ...EMPTY_ROLE_PERMISSIONS };
  for (const key of ROLE_PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') next[key] = obj[key];
  }
  return next;
}

export function isRolePermissionMap(value: unknown): value is RolePermissionMap {
  return normalizeRolePermissions(value) !== null;
}

export function evaluateMemberAccess(
  member: AccessMember,
  targetResource: string,
  action: string
): boolean {
  if (member.role === 'owner') return true;

  const flags = normalizeRolePermissions(member.customRole?.permissions ?? null);
  if (flags) {
    return flags[targetResource as RolePermissionKey] === true;
  }

  if (targetResource === 'attendance') return true;
  if (
    (targetResource === 'booking' || targetResource === 'passes') &&
    (action === 'list' || action === 'read' || action === 'show')
  ) {
    return true;
  }
  return false;
}

const NAV_RESOURCE: Record<string, RolePermissionKey> = {
  billing: 'billing_invoices',
  schedules: 'booking',
  bookings: 'booking',
  passes: 'passes',
  attendance: 'attendance',
  settings: 'policies',
  fleet: 'booking',
  grievances: 'grievances_manage',
};

export function isNavTabAllowed(tab: string, member: AccessMember): boolean {
  if (tab === 'grievances') {
    // 직원도 본인 건의 탭은 열 수 있음. 전체 함은 화면 내부에서 분기.
    return true;
  }
  const resource = NAV_RESOURCE[tab];
  if (!resource) return true;
  return evaluateMemberAccess(member, resource, 'read');
}
