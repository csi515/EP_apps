/**
 * 조직 리더(DESCENDANTS) 하위 멤버 해석 — MBO 등 Capability가 Core에서 소비.
 */
import type { DepartmentScopeType } from '@/core/organizations/departmentScope';

export type DeptLeadAssignment = {
  memberId: string;
  departmentId: string;
  scopeType: DepartmentScopeType;
  departmentPath: string;
};

export type DeptMembership = {
  memberId: string;
  departmentId: string;
  departmentPath: string;
  userId?: string | null;
};

/** 리더가 DESCENDANTS로 맡은 부서 path 목록 */
export function resolveLeaderDepartmentPaths(
  viewerMemberId: string,
  assignments: readonly DeptLeadAssignment[],
): string[] {
  return assignments
    .filter((row) => row.memberId === viewerMemberId && row.scopeType === 'DESCENDANTS')
    .map((row) => row.departmentPath)
    .filter((path) => path.length > 0);
}

/** 리더 path 하위에 소속된 member id 집합 (본인 포함 가능) */
export function resolveManagedMemberIds(
  viewerMemberId: string,
  assignments: readonly DeptLeadAssignment[],
  memberships: readonly DeptMembership[],
): Set<string> {
  const leadPaths = resolveLeaderDepartmentPaths(viewerMemberId, assignments);
  const managed = new Set<string>();
  if (leadPaths.length === 0) return managed;

  for (const membership of memberships) {
    if (leadPaths.some((leadPath) => membership.departmentPath.startsWith(leadPath))) {
      managed.add(membership.memberId);
    }
  }
  return managed;
}

/** 대상 userId가 리더 하위인지 */
export function isSubtreeLeaderOfUser(
  viewerMemberId: string,
  targetUserId: string,
  assignments: readonly DeptLeadAssignment[],
  memberships: readonly DeptMembership[],
): boolean {
  const leadPaths = resolveLeaderDepartmentPaths(viewerMemberId, assignments);
  if (leadPaths.length === 0 || !targetUserId) return false;
  return memberships.some(
    (m) =>
      m.userId === targetUserId &&
      leadPaths.some((leadPath) => m.departmentPath.startsWith(leadPath)),
  );
}
