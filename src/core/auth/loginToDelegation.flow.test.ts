/**
 * 로그인 → 사업장 자동선택 → 직급 시드 → 권한 위임 → 기능 접근 종단 흐름
 * 실행: npm run test:login-to-delegation
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Organization } from '@/lib/supabase';
import type { OrganizationMembership } from '@/core/organizations/services/organizationService';
import {
  applyBootstrapToSession,
  assertSelectionInvariant,
} from '@/core/organizations/resolveOrganizationContext';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { mapPresetPermissionTokensToRoleMap } from '@/core/organizations/services/epRoleSeed';
import {
  GENERAL_AFFAIRS_ROLE_TEMPLATE,
  assertCanAssignOrRevokeRole,
  assertCanTransferOwnership,
  canAccessRndPortal,
  canAssignOrRevokeRole,
  canManageMemberRoles,
  canManageRoles,
  canManageShuttleRoutes,
  canTransferOwnership,
  evaluateMemberAccess,
  isNavTabAllowed,
  normalizeRolePermissions,
  type AccessMember,
  type RolePermissionMap,
} from '@/domain/permissions';
import { createAccessControlProvider } from '@/providers/accessControlProvider';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function org(id: string): Organization {
  return {
    id,
    name: id,
    industry_type: 'personal_plant_ops',
    slug: null,
    settings: {},
    is_active: true,
    public_code: '',
    created_at: '',
    updated_at: '',
  } as Organization;
}

function mem(
  partial: Partial<OrganizationMembership> &
    Pick<OrganizationMembership, 'id' | 'organizationId' | 'role'>
): OrganizationMembership {
  return {
    staffId: null,
    parentCustomerId: null,
    organization: partial.organization ?? org(partial.organizationId),
    ...partial,
  };
}

function member(
  role: string,
  perms?: Partial<RolePermissionMap> | null
): AccessMember {
  return {
    id: `u-${role}`,
    role,
    customRole: perms
      ? { permissions: { ...mapPresetPermissionTokensToRoleMap([]), ...perms } }
      : null,
  };
}

console.log('[test:login-to-delegation] start');

// ── 1. 로그인 후 부트스트랩: 멤버십 → 워크스페이스 세션 ─────────────
{
  const session = applyBootstrapToSession({
    memberships: [mem({ id: 'm1', organizationId: 'plant-1', role: 'owner' })],
    blockedOwnerOrgIds: [],
    portalChildren: 0,
    parentId: null,
    parentPortalModeActive: false,
    storedOrganizationId: null,
  });
  assert.equal(session.portalMode, 'none');
  assert.equal(session.selectedMembership?.organizationId, 'plant-1');
  assertSelectionInvariant(session.selectedMembership);
}

// ── 2. 프리셋 직급 시드 → RolePermissionMap (대표/본부장/팀원) ───────
{
  const preset = getIndustryPreset('personal_plant_ops');
  assert.ok(preset?.roles?.length);
  const byName = Object.fromEntries(preset!.roles.map((r) => [r.name, r]));

  const ceo = mapPresetPermissionTokensToRoleMap(byName['임원'].permissions);
  assert.equal(ceo['roles:assign'], true);
  assert.equal(ceo['ownership:transfer'], true);
  assert.equal(ceo['rnd_portal:access'], true);
  assert.equal(ceo['shuttle:manage'], true);

  const hq = mapPresetPermissionTokensToRoleMap(byName['부장'].permissions);
  assert.equal(hq['roles:assign'], true, '부장: MBO/결재 토큰 → 위임 가능');
  assert.equal(hq['members:manage'], true);
  assert.equal(hq['resources:manage'], true);
  assert.equal(hq['rnd_portal:access'], true);
  assert.equal(hq.billing_invoices, false);

  const staff = mapPresetPermissionTokensToRoleMap(byName['사원'].permissions);
  assert.equal(staff.booking, true);
  assert.equal(staff.grievances_manage, true);
  assert.equal(staff['roles:assign'], false, '사원은 직급 위임 불가');
  assert.equal(staff['ownership:transfer'], false);
}

// ── 3. 권한 위임: 대표 → 총무 템플릿 부여, 권한 상승 방어 ───────────
{
  const owner = member('owner');
  const staff = member('staff');
  const gaPerms = {
    ...GENERAL_AFFAIRS_ROLE_TEMPLATE.permissions,
  } as RolePermissionMap;

  assert.equal(canManageRoles(owner), true);
  assert.equal(canManageMemberRoles(owner, staff), true);
  assert.equal(canAssignOrRevokeRole(owner, staff, gaPerms), true);
  assert.doesNotThrow(() => assertCanAssignOrRevokeRole(owner, staff, gaPerms));

  // 총무 위임 관리자는 직급 부여 가능
  const ga = member('staff', {
    'members:manage': true,
    'roles:assign': true,
    resources_manage: true,
    'resources:manage': true,
  });
  assert.equal(canManageRoles(ga), true);
  assert.equal(canAssignOrRevokeRole(ga, staff, { booking: true } as RolePermissionMap), true);

  // 본인이 없는 ownership:transfer를 타인에게 부여 → 차단
  assert.equal(
    canAssignOrRevokeRole(ga, staff, { 'ownership:transfer': true } as RolePermissionMap),
    false
  );
  assert.throws(
    () => assertCanAssignOrRevokeRole(ga, staff, { 'ownership:transfer': true } as RolePermissionMap),
    /권한 상승/
  );

  // owner 대상 수정 불가
  assert.equal(canManageMemberRoles(ga, owner), false);
  assert.equal(canAssignOrRevokeRole(ga, owner, gaPerms), false);

  // 일반 직원은 위임 불가
  const plain = member('staff', { booking: true });
  assert.equal(canManageRoles(plain), false);
  assert.equal(canAssignOrRevokeRole(plain, staff, { booking: true } as RolePermissionMap), false);
}

// ── 4. 소유권 이전 위임 (ownership:transfer) ───────────────────────
{
  const owner = member('owner');
  const hr = member('staff', { 'ownership:transfer': true, 'members:manage': true });
  const gaOnly = member('staff', { 'roles:assign': true, 'members:manage': true });
  const target = member('staff');

  assert.equal(canTransferOwnership(owner), true);
  assert.equal(canTransferOwnership(hr), true);
  assert.equal(canTransferOwnership(gaOnly), false);
  assert.doesNotThrow(() => assertCanTransferOwnership(hr, target));
  assert.throws(() => assertCanTransferOwnership(gaOnly, target), /소유권/);
  assert.throws(() => assertCanTransferOwnership(owner, owner), /이미 대표/);
}

// ── 5. Refine accessControl: 위임 전/후 기능 접근 ─────────────────
{
  const ORG = 'plant-1';
  const ownerProvider = createAccessControlProvider({
    getActiveUser: () =>
      ({
        id: 'o1',
        role: 'owner',
        name: '대표',
        permissions: ['*'],
        customRole: null,
      }) as any,
    getOrganizationId: () => ORG,
  });

  assert.equal((await ownerProvider.can({ resource: 'members', action: 'assign_role' })).can, true);
  assert.equal(
    (await ownerProvider.can({ resource: 'organization', action: 'transfer_ownership' })).can,
    true
  );
  assert.equal((await ownerProvider.can({ resource: 'members', action: 'list' })).can, true);

  const delegated = createAccessControlProvider({
    getActiveUser: () =>
      ({
        id: 'ga1',
        role: 'staff',
        name: '총무',
        permissions: ['members:manage', 'roles:assign', 'resources:manage'],
        customRole: {
          permissions: {
            'members:manage': true,
            'roles:assign': true,
            'resources:manage': true,
            resources_manage: true,
            booking: true,
            seat_room: true,
          },
        },
      }) as any,
    getOrganizationId: () => ORG,
  });
  assert.equal((await delegated.can({ resource: 'members', action: 'assign_role' })).can, true);
  assert.equal(
    (await delegated.can({ resource: 'organization', action: 'transfer_ownership' })).can,
    false
  );

  const noOrg = createAccessControlProvider({
    getActiveUser: () => ({ id: 'o1', role: 'owner' }) as any,
    getOrganizationId: () => null,
  });
  const denied = await noOrg.can({ resource: 'members', action: 'list' });
  assert.equal(denied.can, false);
  assert.match(String(denied.reason ?? ''), /사업장/);
}

// ── 6. 기능 표면: 직급별 네비/포털 접근 ───────────────────────────
{
  const owner = member('owner');
  const teamMemberPerms = normalizeRolePermissions(
    mapPresetPermissionTokensToRoleMap([
      'booking:book',
      'whistleblower_grievance:create',
      'mbo:view',
      'research_project:view',
    ])
  )!;
  const teamMember = member('staff', teamMemberPerms);
  const hqPerms = mapPresetPermissionTokensToRoleMap([
    'approval_workflow:*',
    'mbo:*',
    'task_pipeline:*',
    'research_project:*',
    'resources:*',
  ]);
  const hq = member('staff', hqPerms);

  assert.equal(teamMemberPerms['mbo:goals:read'], true, 'mbo:view → goals:read');
  assert.equal(
    teamMemberPerms['mbo:evaluations:read_all'],
    false,
    'mbo:view must not grant evaluations:read_all'
  );
  assert.equal(hqPerms['mbo:evaluations:read_all'], true, 'mbo:* grants evaluations:read_all');

  assert.equal(canAccessRndPortal(owner), true);
  assert.equal(canAccessRndPortal(hq), true);
  assert.equal(canAccessRndPortal(teamMember), true, 'research_project:view → rnd 접근');

  assert.equal(isNavTabAllowed('grievances', teamMember), true);
  assert.equal(isNavTabAllowed('bookings', teamMember), true);
  assert.equal(isNavTabAllowed('fleet', hq), true);

  assert.equal(canManageShuttleRoutes(owner), true);
  assert.equal(canManageShuttleRoutes(teamMember), false);

  assert.equal(evaluateMemberAccess(hq, 'resources_manage', 'write'), true);
  assert.equal(evaluateMemberAccess(teamMember, 'roles:assign', 'write'), false);
}

// ── 7. 소스 계약: 로그인 후 고객 포털로 새지 않음 ─────────────────
{
  const authProviderSrc = readFileSync(join(root, 'src/providers/authProvider.ts'), 'utf8');
  assert.doesNotMatch(authProviderSrc, /\/customer\/pass/);
  assert.match(authProviderSrc, /redirectTo:\s*["']\/workspace["']/);

  const gateSrc = readFileSync(join(root, 'src/SupabaseAppGate.tsx'), 'utf8');
  assert.match(gateSrc, /no-organization-membership/);
  assert.doesNotMatch(gateSrc, /OrganizationSelector|CustomerShell/);

  const rolesPage = readFileSync(join(root, 'src/pages/settings/DynamicRoleSettingsPage.tsx'), 'utf8');
  assert.match(rolesPage, /RolePermissionMatrix|위임/);
}

console.log('loginToDelegation.flow.test.ts: ok');
