/**
 * 조직도·로스터 공통 순수 헬퍼 (페이지/코어 공용)
 */
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import type { DepartmentScopeType } from '@/core/organizations/departmentScope';

export type OrgChartNodeLike = {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder?: number | null;
};

export type DepartmentPlacementLike = {
  id: string;
  department_id: string;
  member_id: string;
  scope_type: DepartmentScopeType | string;
  custom_role_id?: string | null;
};

/** 표시명: name → email → login_id → user_id 앞 8자 */
export function memberDisplayLabel(
  member: Pick<DynamicMemberRow, 'user_id'> &
    Partial<Pick<DynamicMemberRow, 'name' | 'email' | 'login_id'>>,
): string {
  if (member.name?.trim()) return member.name.trim();
  if (member.email?.trim()) return member.email.trim();
  if (member.login_id?.trim()) return member.login_id.trim();
  return `${member.user_id.slice(0, 8)}…`;
}

/** parentId → 정렬된 자식 목록 (sortOrder 우선, 없으면 이름) */
export function buildDepartmentChildrenMap<T extends OrgChartNodeLike>(
  nodes: readonly T[],
): Map<string | null, T[]> {
  const map = new Map<string | null, T[]>();
  for (const node of nodes) {
    const key = node.parentId;
    const list = map.get(key) ?? [];
    list.push(node);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      const ao = a.sortOrder ?? null;
      const bo = b.sortOrder ?? null;
      if (ao != null && bo != null && ao !== bo) return ao - bo;
      if (ao != null && bo == null) return -1;
      if (ao == null && bo != null) return 1;
      return a.name.localeCompare(b.name, 'ko');
    });
  }
  return map;
}

/** 주 소속 배치: SELF_ONLY 우선, 없으면 첫 배치 */
export function resolvePrimaryPlacement<T extends DepartmentPlacementLike>(
  memberId: string,
  departmentMembers: readonly T[],
): T | null {
  const placements = departmentMembers.filter((dm) => dm.member_id === memberId);
  if (placements.length === 0) return null;
  return placements.find((p) => p.scope_type === 'SELF_ONLY') ?? placements[0] ?? null;
}

/** 사용자 주 소속 부서 id (멤버 매칭 후 primary placement) */
export function resolvePrimaryDepartmentIdForUser(
  userId: string | null | undefined,
  members: readonly Pick<DynamicMemberRow, 'id' | 'user_id' | 'is_active'>[],
  departmentMembers: readonly DepartmentPlacementLike[],
): string | null {
  if (!userId) return null;
  const member = members.find((m) => m.user_id === userId && m.is_active !== false);
  if (!member) return null;
  return resolvePrimaryPlacement(member.id, departmentMembers)?.department_id ?? null;
}
