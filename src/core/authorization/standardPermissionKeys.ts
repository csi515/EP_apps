/** `<domain>:<resource>:<action>` 권한 키. */

export const STANDARD_PERMISSION_KEYS = [
  'mbo:goals:write',
  'mbo:goals:read',
  'mbo:evaluations:approve',
  'mbo:evaluations:read_all',
  'shuttle:routes:manage',
  'shuttle:dispatch:operate',
  'shuttle:logs:read',
  'billing:invoices:read',
  'attendance:records:write',
] as const;

export type StandardPermissionKey = (typeof STANDARD_PERMISSION_KEYS)[number];

const RESOURCE_ACTION: Record<string, Partial<Record<string, StandardPermissionKey>>> = {
  mbo_goals: { write: 'mbo:goals:write', create: 'mbo:goals:write', edit: 'mbo:goals:write', read: 'mbo:goals:read', list: 'mbo:goals:read', show: 'mbo:goals:read' },
  mbo_objectives: { write: 'mbo:goals:write', create: 'mbo:goals:write', read: 'mbo:goals:read', list: 'mbo:goals:read' },
  mbo_evaluations: { approve: 'mbo:evaluations:approve', read_all: 'mbo:evaluations:read_all', list: 'mbo:evaluations:read_all', read: 'mbo:evaluations:read_all' },
  shuttle_routes: { manage: 'shuttle:routes:manage', edit: 'shuttle:routes:manage' },
  shuttle_dispatch: { operate: 'shuttle:dispatch:operate', edit: 'shuttle:dispatch:operate' },
  shuttle_logs: { read: 'shuttle:logs:read', list: 'shuttle:logs:read' },
  billing_invoices: { read: 'billing:invoices:read', list: 'billing:invoices:read', show: 'billing:invoices:read' },
  attendance_records: { write: 'attendance:records:write', create: 'attendance:records:write', edit: 'attendance:records:write' },
  attendance: { write: 'attendance:records:write', create: 'attendance:records:write' },
};

export function resolveStandardPermissionKey(resource?: string, action?: string): StandardPermissionKey | null {
  if (!resource) return null;
  const table = RESOURCE_ACTION[resource.trim().toLowerCase()];
  if (!table) return null;
  return table[(action || 'list').trim().toLowerCase()] ?? null;
}

export function hasStandardPermission(
  granted: readonly string[] | null | undefined,
  key: StandardPermissionKey,
  role: string | null
): boolean {
  if (role === 'owner' || role === 'admin') return true;
  const list = granted ?? [];
  return list.includes(key) || list.includes('*');
}
