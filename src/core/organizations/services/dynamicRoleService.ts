import { getCoreClient } from '@/lib/supabase';
import { EMPTY_ROLE_PERMISSIONS, isRolePermissionMap, type RolePermissionMap } from '@/domain/permissions';

export type DynamicRoleRow = {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions: RolePermissionMap;
};

export type DynamicMemberRow = {
  id: string;
  user_id: string;
  role: string;
  organization_role_id: string | null;
};

export async function listDynamicRoles(organizationId: string): Promise<DynamicRoleRow[]> {
  const client = getCoreClient();
  const roleRes = await client.from('organization_roles').select('*').eq('tenant_id', organizationId);
  if (roleRes.error) throw new Error(roleRes.error.message);
  return ((roleRes.data ?? []) as unknown as DynamicRoleRow[]).map((row) => ({
    ...row,
    permissions: isRolePermissionMap(row.permissions) ? row.permissions : EMPTY_ROLE_PERMISSIONS,
  }));
}

export async function listRoleMembers(organizationId: string): Promise<DynamicMemberRow[]> {
  const client = getCoreClient();
  const memberRes = await client
    .from('organization_members')
    .select('id,user_id,role,organization_role_id')
    .eq('organization_id', organizationId);
  if (memberRes.error) throw new Error(memberRes.error.message);
  return (memberRes.data ?? []) as DynamicMemberRow[];
}

export async function saveDynamicRole(input: {
  organizationId: string;
  id?: string | null;
  name: string;
  permissions: RolePermissionMap;
}): Promise<void> {
  const client = getCoreClient();
  const payload = {
    tenant_id: input.organizationId,
    name: input.name,
    permissions: input.permissions,
    updated_at: new Date().toISOString(),
  };
  const result = input.id
    ? await client.from('organization_roles').update(payload).eq('id', input.id)
    : await client.from('organization_roles').insert(payload);
  if (result.error) throw new Error(result.error.message);
}

export async function deleteDynamicRole(id: string): Promise<void> {
  const client = getCoreClient();
  const result = await client.from('organization_roles').delete().eq('id', id);
  if (result.error) throw new Error(result.error.message);
}

export async function assignOrganizationRole(memberId: string, roleId: string | null): Promise<void> {
  const client = getCoreClient();
  const result = await client.from('organization_members').update({ organization_role_id: roleId }).eq('id', memberId);
  if (result.error) throw new Error(result.error.message);
}
