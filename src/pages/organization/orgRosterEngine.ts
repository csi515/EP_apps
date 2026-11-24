/**
 * 전사 직원 로스터 파생·필터·정렬 (순수 함수)
 */
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import type { DepartmentMemberRow, OrgNode } from './useOrganizationTree';

export type OrgRosterEmploymentFilter = 'all' | 'active' | 'inactive';

export type OrgRosterSortKey =
  | 'name'
  | 'loginId'
  | 'roleName'
  | 'departmentName'
  | 'employment';

export type OrgRosterRow = {
  memberId: string;
  loginId: string;
  name: string;
  email: string;
  phone: string;
  roleId: string | null;
  roleName: string;
  placementRoleId: string | null;
  departmentId: string | null;
  /** 주 소속(최하위) 부서 이름 */
  departmentName: string;
  isActive: boolean;
  joinedAt: string | null;
};

export type OrgRosterFilterInput = {
  query: string;
  employment: OrgRosterEmploymentFilter;
};

function memberDisplayName(member: DynamicMemberRow): string {
  if (member.name?.trim()) return member.name.trim();
  if (member.email?.trim()) return member.email.trim();
  if (member.login_id?.trim()) return member.login_id.trim();
  return `${member.user_id.slice(0, 8)}…`;
}

/** 주 소속 배치: SELF_ONLY 우선, 없으면 첫 배치 */
export function resolvePrimaryPlacement(
  memberId: string,
  departmentMembers: readonly DepartmentMemberRow[],
): DepartmentMemberRow | null {
  const placements = departmentMembers.filter((dm) => dm.member_id === memberId);
  if (placements.length === 0) return null;
  return placements.find((p) => p.scope_type === 'SELF_ONLY') ?? placements[0] ?? null;
}

export function resolveDepartmentName(
  departmentId: string | null,
  nodesById: ReadonlyMap<string, OrgNode>,
): string {
  if (!departmentId) return '';
  return nodesById.get(departmentId)?.name ?? '';
}

export function buildOrgRosterRows(input: {
  members: readonly DynamicMemberRow[];
  nodes: readonly OrgNode[];
  departmentMembers: readonly DepartmentMemberRow[];
  roles: readonly DynamicRoleRow[];
}): OrgRosterRow[] {
  const nodesById = new Map(input.nodes.map((n) => [n.id, n]));
  const roleNameById = new Map(input.roles.map((r) => [r.id, r.name]));

  return input.members.map((member) => {
    const placement = resolvePrimaryPlacement(member.id, input.departmentMembers);
    const departmentId = placement?.department_id ?? member.department_id ?? null;
    const roleId = member.organization_role_id ?? null;
    return {
      memberId: member.id,
      loginId: (member.login_id ?? '').trim(),
      name: memberDisplayName(member),
      email: (member.email ?? '').trim(),
      phone: (member.phone ?? '').trim(),
      roleId,
      roleName: roleId ? (roleNameById.get(roleId) ?? '') : '',
      placementRoleId: placement?.custom_role_id ?? null,
      departmentId,
      departmentName: resolveDepartmentName(departmentId, nodesById),
      isActive: member.is_active !== false,
      joinedAt: member.joined_at ?? null,
    };
  });
}

function matchesQuery(row: OrgRosterRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.name.toLowerCase().includes(q) ||
    row.loginId.toLowerCase().includes(q) ||
    row.email.toLowerCase().includes(q) ||
    row.phone.toLowerCase().includes(q) ||
    row.departmentName.toLowerCase().includes(q)
  );
}

function matchesEmployment(row: OrgRosterRow, employment: OrgRosterEmploymentFilter): boolean {
  if (employment === 'all') return true;
  if (employment === 'active') return row.isActive;
  return !row.isActive;
}

export function filterOrgRosterRows(
  rows: readonly OrgRosterRow[],
  filter: OrgRosterFilterInput,
): OrgRosterRow[] {
  return rows.filter(
    (row) => matchesQuery(row, filter.query) && matchesEmployment(row, filter.employment),
  );
}

export function sortOrgRosterRows(
  rows: readonly OrgRosterRow[],
  sortKey: OrgRosterSortKey,
  direction: 'asc' | 'desc' = 'asc',
): OrgRosterRow[] {
  const factor = direction === 'asc' ? 1 : -1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name':
        cmp = a.name.localeCompare(b.name, 'ko');
        break;
      case 'loginId':
        cmp = a.loginId.localeCompare(b.loginId, 'ko');
        break;
      case 'roleName':
        cmp = a.roleName.localeCompare(b.roleName, 'ko');
        break;
      case 'departmentName':
        cmp = a.departmentName.localeCompare(b.departmentName, 'ko');
        break;
      case 'employment':
        cmp = Number(b.isActive) - Number(a.isActive);
        break;
      default:
        cmp = 0;
    }
    return cmp * factor;
  });
  return sorted;
}

export function formatJoinedAt(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatRosterExportFilename(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `전사_직원_조직현황_${y}${m}${d}.xlsx`;
}
