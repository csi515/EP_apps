/** 사업주가 저장한 직급 권한(JSONB boolean) 판정. */

export const ROLE_PERMISSION_KEYS = [
  'billing_invoices',
  'attendance',
  'booking',
  'passes',
  'statistics',
  'members_manage',
  'policies',
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
};

export type AccessMember = {
  role?: string | null;
  customRole?: { permissions?: RolePermissionMap | null } | null;
};

export function isRolePermissionMap(value: unknown): value is RolePermissionMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return ROLE_PERMISSION_KEYS.every((key) => typeof (value as RolePermissionMap)[key] === 'boolean');
}

export function evaluateMemberAccess(
  member: AccessMember,
  targetResource: string,
  action: string
): boolean {
  if (member.role === 'owner') return true;

  const flags = member.customRole?.permissions;
  if (isRolePermissionMap(flags)) {
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
  passes: 'passes',
  attendance: 'attendance',
  settings: 'policies',
};

export function isNavTabAllowed(tab: string, member: AccessMember): boolean {
  const resource = NAV_RESOURCE[tab];
  if (!resource) return true;
  return evaluateMemberAccess(member, resource, 'read');
}
