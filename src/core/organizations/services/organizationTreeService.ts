import { getCoreClient } from '@/lib/supabase';
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
    .eq('id', input.departmentId);
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
      .eq('id', node.id);
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

/** 주 소속 부서 재배치 — 기존 배정 삭제 후 SELF_ONLY 단일 행 */
export async function reassignMemberDepartment(input: {
  organizationId: string;
  memberId: string;
  departmentId: string;
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
    scope_type: 'SELF_ONLY',
    custom_role_id: null,
  } as never);
  if (error) throw new Error(error.message);
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

export async function transferOrganizationOwnership(input: {
  organizationId: string;
  nextOwnerMemberId: string;
  reason: string;
}): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('transfer_organization_ownership' as never, {
    p_organization_id: input.organizationId,
    p_next_owner_member_id: input.nextOwnerMemberId,
    p_reason: input.reason,
  } as never);
  if (error) throw new Error(error.message);
}
