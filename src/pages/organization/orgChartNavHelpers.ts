/**
 * 조직도 P1 탐색 헬퍼 (순수 함수)
 */
import type { DepartmentMemberRow, OrgNode } from './useOrganizationTree';
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';

/** 리더(DESCENDANTS)가 없는 조직 목록 */
export function listDepartmentsMissingLeaders(
  nodes: readonly OrgNode[],
  departmentMembers: readonly DepartmentMemberRow[],
): OrgNode[] {
  return nodes.filter((node) => {
    const hasLeader = departmentMembers.some(
      (dm) => dm.department_id === node.id && dm.scope_type === 'DESCENDANTS',
    );
    return !hasLeader;
  });
}

/** 사용자 주 소속 부서 (SELF_ONLY 우선, 없으면 첫 배치) */
export function resolvePrimaryDepartmentIdForUser(
  userId: string | null | undefined,
  members: readonly DynamicMemberRow[],
  departmentMembers: readonly DepartmentMemberRow[],
): string | null {
  if (!userId) return null;
  const member = members.find((m) => m.user_id === userId && m.is_active !== false);
  if (!member) return null;
  const placements = departmentMembers.filter((dm) => dm.member_id === member.id);
  if (placements.length === 0) return null;
  const selfOnly = placements.find((p) => p.scope_type === 'SELF_ONLY');
  return (selfOnly ?? placements[0]!).department_id;
}

/** 대상 부서까지 경로에 있는 조상 id (본인 제외) — 펼치기용 */
export function listAncestorDepartmentIds(
  departmentId: string,
  nodes: readonly OrgNode[],
): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ancestors: string[] = [];
  let cur = byId.get(departmentId)?.parentId ?? null;
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur)) break;
    seen.add(cur);
    ancestors.push(cur);
    cur = byId.get(cur)?.parentId ?? null;
  }
  return ancestors;
}

/** 자식이 있는 모든 부서 id (전체 접기용) */
export function listParentDepartmentIds(nodes: readonly OrgNode[]): string[] {
  const parents = new Set<string>();
  for (const node of nodes) {
    if (node.parentId) parents.add(node.parentId);
  }
  return [...parents];
}
