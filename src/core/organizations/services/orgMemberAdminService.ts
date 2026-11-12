import { isLocalAuthEnabled } from '@/core/auth/localAuth/isLocalAuth';
import {
  localProvisionOrgMember,
  localResetMemberPassword,
  localSetMemberActive,
  type LocalProvisionMemberInput,
} from '@/core/auth/localAuth/localAuthApi';
import { getCoreClient } from '@/lib/supabase';
import {
  listDynamicRoles,
  listRoleMembers,
  type DynamicMemberRow,
  type DynamicRoleRow,
} from '@/core/organizations/services/dynamicRoleService';
import { loadOrganizationTree } from '@/core/organizations/services/organizationTreeService';
import {
  COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS,
  describeAppPermissionEffectiveState,
  type AppPermissionEffectiveState,
  type CompanyAppAccessInput,
} from '@/pages/workspace/companyAppAccess';
import {
  listAssignablePublishedApps,
  type PublishedCompanyAppId,
} from '@/pages/workspace/publishedCompanyApps';
import { normalizeRolePermissions } from '@/domain/permissions';

export type AdminMemberDirectoryRow = DynamicMemberRow & {
  roleName: string | null;
  appSummary: {
    granted: number;
    total: number;
    byApp: Array<{ appId: PublishedCompanyAppId; state: AppPermissionEffectiveState }>;
  };
};

export type OrgMembersAdminDirectory = {
  members: AdminMemberDirectoryRow[];
  roles: DynamicRoleRow[];
};

function buildAccessInput(
  member: DynamicMemberRow,
  role: DynamicRoleRow | undefined
): CompanyAppAccessInput {
  return {
    role: member.role,
    customRole: role
      ? {
          permissions: role.permissions,
        }
      : null,
    permissions: normalizeRolePermissions(role?.permissions ?? null),
    feature_permissions: member.feature_permissions ?? null,
  };
}

/** 멤버별 앱 유효 접근 요약 (목록 칩용) */
export function summarizeMemberEffectiveAccess(
  member: DynamicMemberRow,
  role: DynamicRoleRow | undefined
): AdminMemberDirectoryRow['appSummary'] {
  const access = buildAccessInput(member, role);
  const apps = listAssignablePublishedApps().filter((a) => a.id !== 'app_access');
  const byApp = apps.map((app) => ({
    appId: app.id,
    state: describeAppPermissionEffectiveState(app.id, access),
  }));
  const granted = byApp.filter((row) => row.state === 'granted' || row.state === 'role').length;
  return {
    granted,
    total: COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.length,
    byApp,
  };
}

/**
 * 임직원 관리 허브용 디렉터리 스냅샷.
 * local-auth GET members 는 부서 조인을 포함. PostgREST 경로는 tree 조인으로 보강.
 */
export async function loadOrgMembersAdminDirectory(
  organizationId: string
): Promise<OrgMembersAdminDirectory> {
  const [roles, members] = await Promise.all([
    listDynamicRoles(organizationId),
    listRoleMembers(organizationId),
  ]);

  const roleById = new Map(roles.map((r) => [r.id, r]));
  let enriched = members;

  const needsDeptJoin = members.some((m) => m.department_id == null && m.department_name == null);
  if (needsDeptJoin && !isLocalAuthEnabled()) {
    try {
      const tree = await loadOrganizationTree(organizationId);
      const nodeById = new Map(tree.nodes.map((n) => [n.id, n]));
      const primaryDept = new Map<
        string,
        { department_id: string; scope_type: string; name: string; path: string }
      >();
      for (const dm of tree.departmentMembers) {
        const node = nodeById.get(dm.department_id);
        if (!node) continue;
        const prev = primaryDept.get(dm.member_id);
        const rank =
          dm.scope_type === 'DESCENDANTS' ? 0 : dm.scope_type === 'GLOBAL' ? 1 : 2;
        const prevRank = prev
          ? prev.scope_type === 'DESCENDANTS'
            ? 0
            : prev.scope_type === 'GLOBAL'
              ? 1
              : 2
          : 99;
        if (!prev || rank < prevRank) {
          primaryDept.set(dm.member_id, {
            department_id: dm.department_id,
            scope_type: dm.scope_type,
            name: node.name,
            path: node.path,
          });
        }
      }
      enriched = members.map((m) => {
        const dept = primaryDept.get(m.id);
        if (!dept) return m;
        return {
          ...m,
          department_id: dept.department_id,
          department_name: dept.name,
          department_path: dept.path,
          department_scope_type: dept.scope_type,
        };
      });
    } catch {
      /* 부서 조인 실패 시 멤버만 반환 */
    }
  }

  return {
    roles,
    members: enriched.map((m) => {
      const role = m.organization_role_id ? roleById.get(m.organization_role_id) : undefined;
      return {
        ...m,
        roleName: role?.name ?? null,
        appSummary: summarizeMemberEffectiveAccess(m, role),
      };
    }),
  };
}

export type ProvisionOrgMemberInput = {
  organizationId: string;
  loginId: string;
  password: string;
  fullName: string;
  baseRole?: 'staff' | 'manager' | 'admin';
  organizationRoleId?: string | null;
  departmentId?: string | null;
  scopeType?: 'SELF_ONLY' | 'DESCENDANTS' | 'GLOBAL';
};

export async function provisionOrgMember(input: ProvisionOrgMemberInput) {
  if (isLocalAuthEnabled()) {
    const payload: LocalProvisionMemberInput = {
      organizationId: input.organizationId,
      loginId: input.loginId,
      password: input.password,
      fullName: input.fullName,
      baseRole: input.baseRole,
      organizationRoleId: input.organizationRoleId,
      departmentId: input.departmentId,
      scopeType: input.scopeType,
    };
    return localProvisionOrgMember(payload);
  }

  const client = getCoreClient();
  const { data, error } = await (client as any).rpc('admin_provision_member', {
    p_org_id: input.organizationId,
    p_login_id: input.loginId.trim().toLowerCase(),
    p_password: input.password,
    p_full_name: input.fullName.trim(),
    p_base_role: input.baseRole ?? 'staff',
    p_organization_role_id: input.organizationRoleId ?? null,
    p_department_id: input.departmentId ?? null,
    p_scope_type: input.scopeType ?? 'SELF_ONLY',
  });
  if (error) throw new Error(error.message);
  return data as {
    user_id: string;
    member_id: string;
    staff_id: string;
    login_id: string;
    full_name: string | null;
    must_change_password: boolean;
  };
}

export async function resetMemberPassword(
  organizationId: string,
  memberId: string,
  password: string
): Promise<void> {
  if (isLocalAuthEnabled()) {
    await localResetMemberPassword(memberId, password);
    return;
  }
  const client = getCoreClient();
  const { error } = await (client as any).rpc('admin_reset_member_password', {
    p_org_id: organizationId,
    p_member_id: memberId,
    p_new_password: password,
  });
  if (error) throw new Error(error.message);
}

export async function setMemberActive(
  organizationId: string,
  memberId: string,
  isActive: boolean
): Promise<void> {
  if (isLocalAuthEnabled()) {
    await localSetMemberActive(memberId, isActive);
    return;
  }
  const client = getCoreClient();
  const { error } = await (client as any).rpc('admin_deactivate_member', {
    p_org_id: organizationId,
    p_member_id: memberId,
    p_is_active: isActive,
  });
  if (error) throw new Error(error.message);
}

/** 초기 비밀번호 생성 (표시용, 저장은 호출자가 함) */
export function generateInitialPassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
