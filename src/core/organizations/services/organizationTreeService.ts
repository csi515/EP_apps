import { getCoreClient } from '@/lib/supabase';
import { isLocalAuthEnabled } from '@/core/auth/localAuth/isLocalAuth';
import {
  buildDepartmentPath,
  depthFromPath,
  rewriteSubtreePath,
  type DepartmentScopeType,
} from '@/core/organizations/departmentScope';
import { listRoleMembers, type DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';

export type DepartmentRow = {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  depth: number;
  unit_kind?: string | null;
  code?: string | null;
};

export type DepartmentMemberRow = {
  id: string;
  department_id: string;
  member_id: string;
  scope_type: DepartmentScopeType;
  custom_role_id: string | null;
};

export type OrgTreeNode = {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  unitKind: string | null;
  code: string | null;
};

export const DEPARTMENT_UNIT_KIND_SUGGESTIONS = [
  '실',
  '그룹',
  '부',
  '센터',
  '사무국',
  '섹션',
  '공장',
  '팀',
  '파트',
] as const;

function toNode(row: DepartmentRow): OrgTreeNode {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    path: row.path,
    unitKind: row.unit_kind ?? null,
    code: row.code ?? null,
  };
}

export async function listDepartments(organizationId: string): Promise<OrgTreeNode[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('departments' as never)
    .select('id,name,parent_id,path,depth,unit_kind,code')
    .eq('organization_id', organizationId)
    .order('path', { ascending: true });
  if (error) {
    // unit_kind 미적용 DB 호환
    const fallback = await client
      .from('departments' as never)
      .select('id,name,parent_id,path,depth')
      .eq('organization_id', organizationId)
      .order('path', { ascending: true });
    if (fallback.error) throw new Error(fallback.error.message);
    return ((fallback.data ?? []) as unknown as DepartmentRow[]).map(toNode);
  }
  return ((data ?? []) as unknown as DepartmentRow[]).map(toNode);
}

export async function listDepartmentMembers(organizationId: string): Promise<DepartmentMemberRow[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('department_members' as never)
    .select('id,department_id,member_id,scope_type,custom_role_id')
    .eq('organization_id', organizationId);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DepartmentMemberRow[];
}

export async function loadOrganizationTree(organizationId: string): Promise<{
  nodes: OrgTreeNode[];
  members: DynamicMemberRow[];
  departmentMembers: DepartmentMemberRow[];
}> {
  const [nodes, departmentMembers, members] = await Promise.all([
    listDepartments(organizationId),
    listDepartmentMembers(organizationId),
    listRoleMembers(organizationId),
  ]);
  return { nodes, members, departmentMembers };
}

export async function createDepartment(input: {
  organizationId: string;
  name: string;
  parentId: string | null;
  parentPath: string | null;
  unitKind?: string | null;
  code?: string | null;
}): Promise<void> {
  const trimmed = input.name.trim();
  if (!trimmed) return;
  const client = getCoreClient();
  const id = crypto.randomUUID();
  const path = buildDepartmentPath(input.parentPath, id);
  const payload: Record<string, unknown> = {
    id,
    organization_id: input.organizationId,
    parent_id: input.parentId,
    name: trimmed,
    path,
    depth: depthFromPath(path),
  };
  if (input.unitKind?.trim()) payload.unit_kind = input.unitKind.trim();
  if (input.code?.trim()) payload.code = input.code.trim();
  const { error } = await client.from('departments' as never).insert(payload as never);
  if (error) throw new Error(error.message);
}

export async function renameDepartment(input: {
  organizationId: string;
  departmentId: string;
  name: string;
  unitKind?: string | null;
  code?: string | null;
}): Promise<void> {
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error('부서 이름이 필요합니다.');
  const client = getCoreClient();
  const patch: Record<string, unknown> = {
    name: trimmed,
    updated_at: new Date().toISOString(),
  };
  if (input.unitKind !== undefined) {
    patch.unit_kind = input.unitKind?.trim() || null;
  }
  if (input.code !== undefined) {
    patch.code = input.code?.trim() || null;
  }
  const { error } = await client
    .from('departments' as never)
    .update(patch as never)
    .eq('id', input.departmentId)
    .eq('organization_id', input.organizationId);
  if (error) throw new Error(error.message);
}

export async function deleteDepartment(input: {
  organizationId: string;
  departmentId: string;
}): Promise<void> {
  const client = getCoreClient();
  const { data: children, error: childError } = await client
    .from('departments' as never)
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('parent_id', input.departmentId)
    .limit(1);
  if (childError) throw new Error(childError.message);
  if ((children ?? []).length > 0) {
    throw new Error('하위 조직이 있으면 삭제할 수 없습니다. 먼저 하위 조직을 이동하거나 삭제하세요.');
  }
  const { error: memberError } = await client
    .from('department_members' as never)
    .delete()
    .eq('department_id', input.departmentId);
  if (memberError) throw new Error(memberError.message);
  const { error } = await client
    .from('departments' as never)
    .delete()
    .eq('id', input.departmentId)
    .eq('organization_id', input.organizationId);
  if (error) throw new Error(error.message);
}

async function moveDepartmentClientSide(
  organizationId: string,
  departmentId: string,
  newParentId: string | null,
): Promise<void> {
  const nodes = await listDepartments(organizationId);
  const moving = nodes.find((n) => n.id === departmentId);
  if (!moving) throw new Error('부서를 찾을 수 없습니다.');
  if (newParentId === departmentId) throw new Error('자기 자신을 상위 부서로 지정할 수 없습니다.');
  const newParent = newParentId ? nodes.find((n) => n.id === newParentId) : null;
  if (newParentId && !newParent) throw new Error('상위 부서를 찾을 수 없습니다.');
  if (newParent && newParent.path.startsWith(moving.path)) {
    throw new Error('하위 조직 아래로 이동할 수 없습니다.');
  }
  const newPath = buildDepartmentPath(newParent?.path ?? null, departmentId);
  const client = getCoreClient();
  const subtree = nodes.filter((n) => n.path.startsWith(moving.path));
  for (const node of subtree) {
    const path = rewriteSubtreePath(moving.path, newPath, node.path);
    const patch: Record<string, unknown> = {
      path,
      depth: depthFromPath(path),
      updated_at: new Date().toISOString(),
    };
    if (node.id === departmentId) patch.parent_id = newParentId;
    const { error } = await client
      .from('departments' as never)
      .update(patch as never)
      .eq('id', node.id)
      .eq('organization_id', organizationId);
    if (error) throw new Error(error.message);
  }
}

export async function moveDepartment(
  departmentId: string,
  newParentId: string | null,
  organizationId?: string,
): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('move_department' as never, {
    p_department_id: departmentId,
    p_new_parent_id: newParentId,
  } as never);
  if (!error) return;
  if (!organizationId) throw new Error(error.message);
  await moveDepartmentClientSide(organizationId, departmentId, newParentId);
}

export async function assignDepartmentScope(input: {
  organizationId: string;
  departmentId: string;
  memberId: string;
  scopeType: DepartmentScopeType;
  customRoleId?: string | null;
}): Promise<void> {
  const client = getCoreClient();
  if (input.customRoleId) {
    const { error: rpcError } = await client.rpc('assign_department_member_role' as never, {
      p_target_member_id: input.memberId,
      p_department_id: input.departmentId,
      p_role_id: input.customRoleId,
      p_scope_type: input.scopeType,
    } as never);
    if (rpcError) throw new Error(rpcError.message);
    try {
      await client.auth.refreshSession();
    } catch {
      // 세션 갱신 실패 시 UI에서 재로그인 안내
    }
    return;
  }
  const { error } = await client.from('department_members' as never).upsert(
    {
      organization_id: input.organizationId,
      department_id: input.departmentId,
      member_id: input.memberId,
      scope_type: input.scopeType,
      custom_role_id: input.customRoleId ?? null,
    } as never,
    { onConflict: 'department_id,member_id' } as never,
  );
  if (error) throw new Error(error.message);
}

/** 배치가 없는 활성 멤버 (owner 제외) */
export function listUnassignedMembers(
  members: readonly DynamicMemberRow[],
  departmentMembers: readonly DepartmentMemberRow[],
): DynamicMemberRow[] {
  const placed = new Set(departmentMembers.map((row) => row.member_id));
  return members.filter(
    (m) => m.role !== 'owner' && m.is_active !== false && !placed.has(m.id),
  );
}

/** 주 소속 부서 재배치 — 기존 배정 삭제 후 SELF_ONLY 단일 행 */
export async function reassignMemberDepartment(input: {
  organizationId: string;
  memberId: string;
  departmentId: string;
  scopeType?: DepartmentScopeType;
  customRoleId?: string | null;
}): Promise<void> {
  const client = getCoreClient();
  const { error: delError } = await client
    .from('department_members' as never)
    .delete()
    .eq('organization_id', input.organizationId)
    .eq('member_id', input.memberId);
  if (delError) throw new Error(delError.message);
  const { error } = await client.from('department_members' as never).insert({
    organization_id: input.organizationId,
    department_id: input.departmentId,
    member_id: input.memberId,
    scope_type: input.scopeType ?? 'SELF_ONLY',
    custom_role_id: input.customRoleId ?? null,
  } as never);
  if (error) throw new Error(error.message);
}

/** 주 소속 이동 (reassign 별칭) */
export async function moveMemberToDepartment(input: {
  organizationId: string;
  memberId: string;
  departmentId: string;
  scopeType?: DepartmentScopeType;
  customRoleId?: string | null;
}): Promise<void> {
  await reassignMemberDepartment(input);
}

/**
 * 다수 멤버를 대상 부서로 원자적 주 소속 재배치.
 * - 원격: core.bulk_reassign_department_members RPC
 * - 로컬 Auth / RPC 미적용: reassignMemberDepartment 순차 호출 (문서화 폴백)
 */
export async function bulkReassignMembersToDepartment(input: {
  organizationId: string;
  departmentId: string;
  memberIds: readonly string[];
}): Promise<void> {
  const memberIds = [...new Set(input.memberIds.filter(Boolean))];
  if (memberIds.length === 0) return;

  const runSequentialFallback = async () => {
    for (const memberId of memberIds) {
      await reassignMemberDepartment({
        organizationId: input.organizationId,
        memberId,
        departmentId: input.departmentId,
      });
    }
  };

  if (isLocalAuthEnabled()) {
    // 로컬 Auth는 SECURITY DEFINER RPC 대신 동일 delete+insert를 순차 수행
    await runSequentialFallback();
    return;
  }

  const client = getCoreClient();
  const { error } = await client.rpc('bulk_reassign_department_members' as never, {
    p_organization_id: input.organizationId,
    p_department_id: input.departmentId,
    p_member_ids: memberIds,
  } as never);
  if (!error) return;

  const msg = error.message || '';
  if (msg.includes('does not exist') || msg.includes('not found in schema')) {
    await runSequentialFallback();
    return;
  }
  throw new Error(msg);
}

/** 겸직 추가 — 기존 배정 유지, 대상 부서에 upsert */
export async function addMemberSecondaryDepartment(input: {
  organizationId: string;
  memberId: string;
  departmentId: string;
  scopeType?: DepartmentScopeType;
  customRoleId?: string | null;
}): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.from('department_members' as never).upsert(
    {
      organization_id: input.organizationId,
      department_id: input.departmentId,
      member_id: input.memberId,
      scope_type: input.scopeType ?? 'SELF_ONLY',
      custom_role_id: input.customRoleId ?? null,
    } as never,
    { onConflict: 'department_id,member_id' } as never,
  );
  if (error) throw new Error(error.message);
}

/** 특정 부서에서만 배치 해제 (다른 겸직 유지) */
export async function removeMemberFromDepartment(input: {
  organizationId: string;
  memberId: string;
  departmentId: string;
}): Promise<void> {
  const client = getCoreClient();
  const { error } = await client
    .from('department_members' as never)
    .delete()
    .eq('organization_id', input.organizationId)
    .eq('member_id', input.memberId)
    .eq('department_id', input.departmentId);
  if (error) throw new Error(error.message);
}

/**
 * 부서 삭제 + 하위/인원 처리.
 * - memberAction reassign: 인원을 targetParentId(또는 직상위)로 주 소속 이동
 * - memberAction unassign: 해당 부서 인원 배치만 삭제
 * 하위 조직은 항상 targetParentId(또는 직상위)로 이동 후 삭제.
 */
export async function deleteDepartmentWithReassign(input: {
  organizationId: string;
  departmentId: string;
  memberAction: 'reassign' | 'unassign';
  /** 하위·인원 이관 대상. null이면 최상위(parent 없음) */
  targetParentId?: string | null;
}): Promise<void> {
  const nodes = await listDepartments(input.organizationId);
  const target = nodes.find((n) => n.id === input.departmentId);
  if (!target) throw new Error('부서를 찾을 수 없습니다.');
  const children = nodes.filter((n) => n.parentId === input.departmentId);
  const transferParentId =
    input.targetParentId !== undefined ? input.targetParentId : target.parentId;

  if (transferParentId === input.departmentId) {
    throw new Error('이관 대상이 삭제할 조직과 같습니다.');
  }
  if (transferParentId) {
    const transferNode = nodes.find((n) => n.id === transferParentId);
    if (!transferNode) throw new Error('이관 대상 조직을 찾을 수 없습니다.');
    if (transferNode.path.startsWith(target.path)) {
      throw new Error('하위 조직으로는 이관할 수 없습니다.');
    }
  }

  for (const child of children) {
    await moveDepartment(child.id, transferParentId, input.organizationId);
  }

  const placements = await listDepartmentMembers(input.organizationId);
  const inDept = placements.filter((p) => p.department_id === input.departmentId);
  if (input.memberAction === 'reassign') {
    if (!transferParentId) {
      for (const row of inDept) {
        await removeMemberFromDepartment({
          organizationId: input.organizationId,
          memberId: row.member_id,
          departmentId: input.departmentId,
        });
      }
    } else {
      for (const row of inDept) {
        await moveMemberToDepartment({
          organizationId: input.organizationId,
          memberId: row.member_id,
          departmentId: transferParentId,
          scopeType: row.scope_type,
          customRoleId: row.custom_role_id,
        });
      }
    }
  } else {
    const client = getCoreClient();
    const { error } = await client
      .from('department_members' as never)
      .delete()
      .eq('organization_id', input.organizationId)
      .eq('department_id', input.departmentId);
    if (error) throw new Error(error.message);
  }

  await deleteDepartment({
    organizationId: input.organizationId,
    departmentId: input.departmentId,
  });
}

export async function revokeMemberRoleViaRpc(memberId: string): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('assign_or_revoke_member_role' as never, {
    p_member_id: memberId,
    p_role_id: null,
    p_revoke: true,
  } as never);
  if (error) throw new Error(error.message);
}
