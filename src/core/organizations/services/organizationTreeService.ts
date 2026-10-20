import { getCoreClient } from '@/lib/supabase';
import {
  buildDepartmentPath,
  depthFromPath,
  type DepartmentScopeType,
} from '@/core/organizations/departmentScope';
import { listRoleMembers, type DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';

export type DepartmentRow = {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  depth: number;
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
};

function toNode(row: DepartmentRow): OrgTreeNode {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    path: row.path,
  };
}

export async function listDepartments(organizationId: string): Promise<OrgTreeNode[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('departments' as never)
    .select('id,name,parent_id,path,depth')
    .eq('organization_id', organizationId)
    .order('path', { ascending: true });
  if (error) throw new Error(error.message);
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
}): Promise<void> {
  const trimmed = input.name.trim();
  if (!trimmed) return;
  const client = getCoreClient();
  const id = crypto.randomUUID();
  const path = buildDepartmentPath(input.parentPath, id);
  const { error } = await client.from('departments' as never).insert({
    id,
    organization_id: input.organizationId,
    parent_id: input.parentId,
    name: trimmed,
    path,
    depth: depthFromPath(path),
  } as never);
  if (error) throw new Error(error.message);
}

export async function moveDepartment(departmentId: string, newParentId: string | null): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('move_department' as never, {
    p_department_id: departmentId,
    p_new_parent_id: newParentId,
  } as never);
  if (error) throw new Error(error.message);
}

export async function assignDepartmentScope(input: {
  organizationId: string;
  departmentId: string;
  memberId: string;
  scopeType: DepartmentScopeType;
  customRoleId?: string | null;
}): Promise<void> {
  const client = getCoreClient();
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
