import { getCoreClient } from '@/lib/supabase';
import {
  EMPTY_ROLE_PERMISSIONS,
  normalizeRolePermissions,
  type RolePermissionMap,
} from '@/domain/permissions';
import { isLocalAuthEnabled } from '@/core/auth/localAuth/isLocalAuth';
import {
  localAssignMemberRole,
  localGrantMemberFeaturePermission,
  localListOrgMembers,
  localListOrgRoles,
  localSaveOrgRole,
} from '@/core/auth/localAuth/localAuthApi';

export type DynamicRoleRow = {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions: RolePermissionMap;
  rank_order?: number;
};

export type DynamicMemberRow = {
  id: string;
  user_id: string;
  role: string;
  organization_role_id: string | null;
  custom_role_id?: string | null;
  is_active?: boolean;
  joined_at?: string;
  email?: string;
  name?: string;
  feature_permissions?: Record<string, boolean>;
};

export async function listDynamicRoles(organizationId: string): Promise<DynamicRoleRow[]> {
  if (isLocalAuthEnabled()) {
    const roles = await localListOrgRoles(organizationId);
    return roles.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      is_system: Boolean(row.is_system),
      rank_order: row.rank_order,
      permissions: normalizeRolePermissions(row.permissions) ?? EMPTY_ROLE_PERMISSIONS,
    }));
  }

  const client = getCoreClient();
  const roleRes = await client.from('organization_roles').select('*').eq('tenant_id', organizationId);
  if (roleRes.error) throw new Error(roleRes.error.message);
  return ((roleRes.data ?? []) as unknown as DynamicRoleRow[]).map((row) => ({
    ...row,
    permissions: normalizeRolePermissions(row.permissions) ?? EMPTY_ROLE_PERMISSIONS,
  }));
}

export async function listRoleMembers(organizationId: string): Promise<DynamicMemberRow[]> {
  if (isLocalAuthEnabled()) {
    const members = await localListOrgMembers(organizationId);
    return members.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      organization_role_id: m.organization_role_id,
      feature_permissions: m.feature_permissions,
      email: m.email,
      name: m.name,
      is_active: m.is_active !== false,
    }));
  }

  const client = getCoreClient();
  const memberRes = await (client as any)
    .from('organization_members')
    .select('id,user_id,role,organization_role_id,custom_role_id,is_active,joined_at,feature_permissions')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });
  if (memberRes.error) {
    const fallbackRes = await client
      .from('organization_members')
      .select('id,user_id,role,organization_role_id')
      .eq('organization_id', organizationId);
    if (fallbackRes.error) throw new Error(fallbackRes.error.message);
    return fallbackRes.data as unknown as DynamicMemberRow[];
  }
  return (memberRes.data ?? []) as unknown as DynamicMemberRow[];
}

export async function saveDynamicRole(input: {
  organizationId: string;
  id?: string | null;
  name: string;
  permissions: RolePermissionMap;
  rankOrder?: number;
}): Promise<void> {
  if (isLocalAuthEnabled()) {
    await localSaveOrgRole({
      organizationId: input.organizationId,
      id: input.id,
      name: input.name,
      rank_order: input.rankOrder,
      permissions: input.permissions as Record<string, boolean>,
    });
    return;
  }

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
  if (isLocalAuthEnabled()) {
    throw new Error('로컬 인증 모드에서 개별 직급 삭제는 초기 설정의 일괄 저장으로 처리하세요.');
  }
  const client = getCoreClient();
  const result = await client.from('organization_roles').delete().eq('id', id);
  if (result.error) throw new Error(result.error.message);
}

/**
 * 직원의 직급을 배정하거나 회수(기본 사원으로 강등).
 */
export async function assignOrganizationRole(
  memberId: string,
  roleId: string | null,
  reason: string = ''
): Promise<void> {
  if (isLocalAuthEnabled()) {
    await localAssignMemberRole(memberId, roleId, reason);
    return;
  }

  const client = getCoreClient();
  const rpcRes = await (client as any).rpc('assign_or_revoke_member_role', {
    p_target_member_id: memberId,
    p_new_role_id: roleId || null,
    p_reason: reason,
  });

  if (rpcRes.error) {
    const msg = rpcRes.error.message || '';
    if (msg.includes('does not exist') || msg.includes('not found in schema')) {
      const result = await client
        .from('organization_members')
        .update({ organization_role_id: roleId } as any)
        .eq('id', memberId);
      if (result.error) throw new Error(result.error.message);
      return;
    }
    throw new Error(msg);
  }
}

/**
 * 특정 회원에게 원자적 직무 기능 권한(총무, 노경, 봉사, 셔틀, 소모품 등)을 부여하거나 회수.
 */
export async function grantMemberFeaturePermission(
  memberId: string,
  featureKey: string,
  enabled: boolean
): Promise<void> {
  if (isLocalAuthEnabled()) {
    await localGrantMemberFeaturePermission(memberId, featureKey, enabled);
    return;
  }

  const client = getCoreClient();
  const rpcRes = await (client as any).rpc('grant_member_feature_permission', {
    p_target_member_id: memberId,
    p_feature_key: featureKey,
    p_enabled: enabled,
  });

  if (rpcRes.error) {
    const msg = rpcRes.error.message || '';
    if (msg.includes('does not exist') || msg.includes('not found in schema')) {
      const { data: member } = await (client as any)
        .from('organization_members')
        .select('feature_permissions')
        .eq('id', memberId)
        .single();
      const nextPerms = { ...((member as any)?.feature_permissions || {}), [featureKey]: enabled };
      const { error } = await (client as any)
        .from('organization_members')
        .update({ feature_permissions: nextPerms })
        .eq('id', memberId);
      if (error) throw new Error(error.message);
      return;
    }
    throw new Error(msg);
  }
}
