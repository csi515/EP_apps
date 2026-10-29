import { loadOrganizationTree } from '@/core/organizations/services/organizationTreeService';
import {
  isSubtreeLeaderOfUser,
  resolveLeaderDepartmentPaths,
  resolveManagedMemberIds,
  type DeptLeadAssignment,
  type DeptMembership,
} from '@/core/organizations/departmentLeadScope';

export type MboViewerOrgScope = {
  viewerMemberId: string | null;
  leadDepartmentPaths: string[];
  managedMemberIds: Set<string>;
  managedUserIds: Set<string>;
  isSubtreeManager: boolean;
  isSubtreeLeaderOfTarget: (targetUserId: string | null | undefined) => boolean;
};

export async function loadMboViewerOrgScope(
  organizationId: string,
  viewerUserId: string | null | undefined,
): Promise<MboViewerOrgScope> {
  const empty: MboViewerOrgScope = {
    viewerMemberId: null,
    leadDepartmentPaths: [],
    managedMemberIds: new Set(),
    managedUserIds: new Set(),
    isSubtreeManager: false,
    isSubtreeLeaderOfTarget: () => false,
  };
  if (!organizationId || !viewerUserId) return empty;

  const { nodes, members, departmentMembers } = await loadOrganizationTree(organizationId);
  const viewer = members.find((m) => m.user_id === viewerUserId);
  if (!viewer) return empty;

  const pathByDeptId = new Map(nodes.map((n) => [n.id, n.path]));
  const assignments: DeptLeadAssignment[] = departmentMembers.map((dm) => ({
    memberId: dm.member_id,
    departmentId: dm.department_id,
    scopeType: dm.scope_type,
    departmentPath: pathByDeptId.get(dm.department_id) ?? '',
  }));
  const memberships: DeptMembership[] = departmentMembers.map((dm) => {
    const member = members.find((m) => m.id === dm.member_id);
    return {
      memberId: dm.member_id,
      departmentId: dm.department_id,
      departmentPath: pathByDeptId.get(dm.department_id) ?? '',
      userId: member?.user_id ?? null,
    };
  });

  const leadDepartmentPaths = resolveLeaderDepartmentPaths(viewer.id, assignments);
  const managedMemberIds = resolveManagedMemberIds(viewer.id, assignments, memberships);
  const managedUserIds = new Set<string>();
  for (const membership of memberships) {
    if (managedMemberIds.has(membership.memberId) && membership.userId) {
      managedUserIds.add(membership.userId);
    }
  }

  return {
    viewerMemberId: viewer.id,
    leadDepartmentPaths,
    managedMemberIds,
    managedUserIds,
    isSubtreeManager: leadDepartmentPaths.length > 0,
    isSubtreeLeaderOfTarget: (targetUserId) => {
      if (!targetUserId) return false;
      return isSubtreeLeaderOfUser(viewer.id, targetUserId, assignments, memberships);
    },
  };
}

/** 목표 owner 기준 하위 리더 열람 여부 */
export function canManageObjectiveOwner(
  scope: MboViewerOrgScope,
  ownerId: string | null | undefined,
  currentUserId: string | null | undefined,
  isOrgAdmin: boolean,
): boolean {
  if (isOrgAdmin) return true;
  if (!ownerId) return isOrgAdmin || scope.isSubtreeManager;
  if (currentUserId && ownerId === currentUserId) return true;
  return scope.managedUserIds.has(ownerId);
}
