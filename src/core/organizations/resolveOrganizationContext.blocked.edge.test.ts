/**
 * blocked owner · currentContext · storage 상호작용 엣지 케이스
 * 실행: npm run test:org-blocked-edge
 */
import assert from 'node:assert/strict';
import type { Organization } from '../../lib/supabase';
import type { OrganizationMembership } from './services/organizationService';
import {
  applyBootstrapToSession,
  computePortalAccessFlags,
  nextOrganizationLocalStateAction,
  planBootstrapApply,
  resolveMembershipById,
  resolveMembershipByOrganizationId,
} from './resolveOrganizationContext';

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

console.log('[test:org-blocked-edge] start');

// currentContext가 blocked owner면 건너뛰고 다른 멤버십 선택
{
  const session = applyBootstrapToSession({
    memberships: [
      mem({
        id: 'blocked-ctx',
        organizationId: 'b1',
        role: 'owner',
        isCurrentContext: true,
      }),
      mem({ id: 'ok', organizationId: 'o1', role: 'admin' }),
    ],
    blockedOwnerOrgIds: ['b1'],
    portalChildren: 0,
    parentId: null,
    parentPortalModeActive: false,
    storedOrganizationId: null,
  });
  assert.equal(session.selectedMembership?.id, 'ok');
  assert.equal(session.portalMode, 'none');
}

// portal access flags: parentId 없으면 parent portal 불가
{
  const flags = computePortalAccessFlags(
    [mem({ id: 'p', organizationId: 'o', role: 'parent' })],
    { blockedOwnerOrgIds: [], portalChildren: 1, parentId: null }
  );
  assert.equal(flags.hasParentAccess, true);
  assert.equal(flags.isParentOnly, true);
  assert.equal(flags.canAccessParentPortal, false);
}

{
  const flags = computePortalAccessFlags(
    [mem({ id: 'p', organizationId: 'o', role: 'guardian' })],
    { blockedOwnerOrgIds: [], portalChildren: 0, parentId: 'pid' }
  );
  assert.equal(flags.hasParentAccess, true);
  assert.equal(flags.canAccessParentPortal, true);
}

{
  const flags = computePortalAccessFlags([], {
    blockedOwnerOrgIds: [],
    portalChildren: 0,
    parentId: null,
  });
  assert.equal(flags.staffMemberships.length, 0);
  assert.equal(flags.customerMemberships.length, 0);
  assert.equal(flags.canAccessCustomerPortal, false);
  assert.equal(flags.canAccessParentPortal, false);
  assert.equal(flags.isParentOnly, false);
  assert.equal(flags.isCustomerOnly, false);
}

// blocked owner는 staffMemberships에서 제외
{
  const flags = computePortalAccessFlags(
    [
      mem({ id: 'o', organizationId: 'b', role: 'owner' }),
      mem({ id: 's', organizationId: 'ok', role: 'staff' }),
    ],
    { blockedOwnerOrgIds: ['b'], portalChildren: 0, parentId: null }
  );
  assert.equal(flags.staffMemberships.length, 1);
  assert.equal(flags.staffMemberships[0].id, 's');
}

// resolveMembershipById missing → clear storage
{
  const list = [mem({ id: 'm1', organizationId: 'o1', role: 'admin' })];
  assert.deepEqual(resolveMembershipById(list, 'nope').storage, { action: 'clear' });
  assert.equal(resolveMembershipById(list, 'nope').membership, null);
}

// resolveMembershipByOrganizationId: 동일 org 첫 멤버십
{
  const list = [
    mem({ id: 'a', organizationId: 'o1', role: 'admin' }),
    mem({ id: 'b', organizationId: 'o1', role: 'staff' }),
  ];
  assert.equal(resolveMembershipByOrganizationId(list, 'o1').membership?.id, 'a');
}

// nextOrganizationLocalStateAction
{
  assert.equal(nextOrganizationLocalStateAction('o1', 'o2'), 'clear');
  assert.equal(nextOrganizationLocalStateAction('o1', 'o1'), 'keep');
  assert.equal(nextOrganizationLocalStateAction(null, 'o1'), 'clear');
  assert.equal(nextOrganizationLocalStateAction(undefined, 'o1'), 'clear');
}

// planBootstrapApply: enter_parent 는 레거시 호환만 유지, 런타임 bootstrap은 사용 안 함
{
  const parent = planBootstrapApply({ kind: 'enter_parent' });
  assert.equal(parent.portalMode, 'parent');
  const clear = planBootstrapApply({
    kind: 'select_organization_or_clear',
    organizationId: null,
  });
  assert.equal(clear.portalMode, 'none');
  assert.deepEqual(clear.selection, { by: 'organization', organizationId: null });
}

console.log('resolveOrganizationContext.blocked.edge.test.ts: ok');
