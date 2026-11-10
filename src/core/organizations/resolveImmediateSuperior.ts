/**
 * 조직도상 「바로 윗 상급자」해석 (순수 함수).
 * 주 소속 부서부터 부모로 올라가며 DESCENDANTS 리더를 찾는다. 본인은 제외.
 */
import type { DepartmentScopeType } from './departmentScope';

export type ImmediateSuperiorDeptNode = {
  id: string;
  name: string;
  parentId: string | null;
};

export type ImmediateSuperiorPlacement = {
  memberId: string;
  departmentId: string;
  scopeType: DepartmentScopeType;
};

export type ImmediateSuperiorMember = {
  id: string;
  userId: string;
  displayName: string;
  roleName?: string | null;
};

export type ImmediateSuperiorPerson = {
  memberId: string;
  userId: string;
  displayName: string;
  roleName: string | null;
  departmentId: string;
  departmentName: string;
};

export type ImmediateSuperiorResult = {
  status: 'found' | 'none' | 'no_department' | 'self_is_top';
  viewerDepartmentId: string | null;
  viewerDepartmentName: string | null;
  superior: ImmediateSuperiorPerson | null;
};

function primaryDepartmentId(
  viewerMemberId: string,
  placements: readonly ImmediateSuperiorPlacement[],
): string | null {
  const mine = placements.filter((p) => p.memberId === viewerMemberId);
  if (mine.length === 0) return null;
  const selfOnly = mine.find((p) => p.scopeType === 'SELF_ONLY');
  if (selfOnly) return selfOnly.departmentId;
  return mine[0]!.departmentId;
}

function ancestorsIncludingSelf(
  startDepartmentId: string,
  nodesById: Map<string, ImmediateSuperiorDeptNode>,
): ImmediateSuperiorDeptNode[] {
  const chain: ImmediateSuperiorDeptNode[] = [];
  const seen = new Set<string>();
  let current: string | null = startDepartmentId;
  while (current) {
    if (seen.has(current)) break;
    seen.add(current);
    const node = nodesById.get(current);
    if (!node) break;
    chain.push(node);
    current = node.parentId;
  }
  return chain;
}

function pickLeaderOnDepartment(
  departmentId: string,
  viewerMemberId: string,
  placements: readonly ImmediateSuperiorPlacement[],
  membersById: Map<string, ImmediateSuperiorMember>,
  departmentName: string,
): ImmediateSuperiorPerson | null {
  const leads = placements
    .filter(
      (p) =>
        p.departmentId === departmentId &&
        p.scopeType === 'DESCENDANTS' &&
        p.memberId !== viewerMemberId,
    )
    .sort((a, b) => a.memberId.localeCompare(b.memberId));

  for (const lead of leads) {
    const member = membersById.get(lead.memberId);
    if (!member?.userId) continue;
    return {
      memberId: member.id,
      userId: member.userId,
      displayName: member.displayName,
      roleName: member.roleName ?? null,
      departmentId,
      departmentName,
    };
  }
  return null;
}

/**
 * 시청자의 조직도상 바로 윗 DESCENDANTS 리더를 반환한다.
 */
export function resolveImmediateSuperior(input: {
  viewerMemberId: string;
  departments: readonly ImmediateSuperiorDeptNode[];
  placements: readonly ImmediateSuperiorPlacement[];
  members: readonly ImmediateSuperiorMember[];
}): ImmediateSuperiorResult {
  const { viewerMemberId, departments, placements, members } = input;
  const nodesById = new Map(departments.map((d) => [d.id, d]));
  const membersById = new Map(members.map((m) => [m.id, m]));

  const viewerDeptId = primaryDepartmentId(viewerMemberId, placements);
  if (!viewerDeptId) {
    return {
      status: 'no_department',
      viewerDepartmentId: null,
      viewerDepartmentName: null,
      superior: null,
    };
  }

  const viewerDept = nodesById.get(viewerDeptId) ?? null;
  const viewerDepartmentName = viewerDept?.name ?? null;
  const chain = ancestorsIncludingSelf(viewerDeptId, nodesById);

  for (const dept of chain) {
    const superior = pickLeaderOnDepartment(
      dept.id,
      viewerMemberId,
      placements,
      membersById,
      dept.name,
    );
    if (superior) {
      return {
        status: 'found',
        viewerDepartmentId: viewerDeptId,
        viewerDepartmentName,
        superior,
      };
    }
  }

  const leadsOwnUnit = placements.some(
    (p) => p.memberId === viewerMemberId && p.scopeType === 'DESCENDANTS',
  );
  if (leadsOwnUnit || !viewerDept?.parentId) {
    return {
      status: 'self_is_top',
      viewerDepartmentId: viewerDeptId,
      viewerDepartmentName,
      superior: null,
    };
  }

  return {
    status: 'none',
    viewerDepartmentId: viewerDeptId,
    viewerDepartmentName,
    superior: null,
  };
}
