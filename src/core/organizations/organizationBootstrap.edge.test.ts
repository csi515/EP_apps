/**
 * EP_apps 단일 사업장 자동 선택 · 포털 진입 차단 엣지 케이스
 * 실행: npm run test:org-bootstrap-edge
 */
import assert from 'node:assert/strict';
import type { Organization } from '../../lib/supabase';
import type { OrganizationMembership } from './services/organizationService';
import {
  applyBootstrapToSession,
  assertSelectionInvariant,
  deriveSelectionFields,
  resolveOrganizationBootstrap,
} from './resolveOrganizationContext';

function org(id: string, industryType = 'personal_plant_ops'): Organization {
  return {
    id,
    name: id,
    industry_type: industryType,
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

function boot(input: {
  memberships: OrganizationMembership[];
  blockedOwnerOrgIds?: string[];
  portalChildren?: number;
  parentId?: string | null;
  parentPortalModeActive?: boolean;
  storedOrganizationId?: string | null;
}) {
  return applyBootstrapToSession({
    memberships: input.memberships,
    blockedOwnerOrgIds: input.blockedOwnerOrgIds ?? [],
    portalChildren: input.portalChildren ?? 0,
    parentId: input.parentId ?? null,
    parentPortalModeActive: input.parentPortalModeActive ?? false,
    storedOrganizationId: input.storedOrganizationId ?? null,
  });
}

console.log('[test:org-bootstrap-edge] start');

// ── 0멤버십: 선택 null → 소속 없음 화면 ───────────────────────────
{
  const session = boot({ memberships: [] });
  assert.equal(session.selectedMembership, null);
  assert.equal(session.portalMode, 'none');
  assert.equal(session.decision.kind, 'select_organization_or_clear');
  assertSelectionInvariant(session.selectedMembership);
  assert.equal(deriveSelectionFields(null).currentOrganization, null);
}

// ── 단일 staff: 자동 선택 ─────────────────────────────────────────
{
  const session = boot({
    memberships: [mem({ id: 'm1', organizationId: 'o1', role: 'admin' })],
  });
  assert.equal(session.selectedMembership?.organizationId, 'o1');
  assert.equal(session.portalMode, 'none');
  assertSelectionInvariant(session.selectedMembership);
}

// ── 다중 staff + stored 없음: 첫 staff 자동 선택 (선택기 없음) ─────
{
  const session = boot({
    memberships: [
      mem({ id: 'm1', organizationId: 'o1', role: 'admin' }),
      mem({ id: 'm2', organizationId: 'o2', role: 'staff' }),
      mem({ id: 'm3', organizationId: 'o3', role: 'manager' }),
    ],
  });
  assert.equal(session.selectedMembership?.organizationId, 'o1');
  assert.equal(session.portalMode, 'none');
}

// ── stored org 우선 ───────────────────────────────────────────────
{
  const session = boot({
    memberships: [
      mem({ id: 'm1', organizationId: 'o1', role: 'admin' }),
      mem({ id: 'm2', organizationId: 'o2', role: 'staff' }),
    ],
    storedOrganizationId: 'o2',
  });
  assert.equal(session.selectedMembership?.organizationId, 'o2');
}

// ── stored가 사라진 org: 첫 가용으로 폴백 ─────────────────────────
{
  const session = boot({
    memberships: [
      mem({ id: 'm1', organizationId: 'o1', role: 'admin' }),
      mem({ id: 'm2', organizationId: 'o2', role: 'staff' }),
    ],
    storedOrganizationId: 'org-gone',
  });
  assert.equal(session.selectedMembership?.organizationId, 'o1');
}

// ── isCurrentContext가 stored보다 우선 ────────────────────────────
{
  const session = boot({
    memberships: [
      mem({ id: 'm1', organizationId: 'o1', role: 'admin' }),
      mem({ id: 'm2', organizationId: 'o2', role: 'staff', isCurrentContext: true }),
    ],
    storedOrganizationId: 'o1',
  });
  assert.equal(session.decision.kind, 'select_membership');
  assert.equal(session.selectedMembership?.id, 'm2');
  assert.equal(session.portalMode, 'none');
}

// ── blocked owner + 정상 staff: staff 자동 선택 ───────────────────
{
  const session = boot({
    memberships: [
      mem({ id: 'own', organizationId: 'blocked', role: 'owner' }),
      mem({ id: 'st', organizationId: 'ok', role: 'staff' }),
    ],
    blockedOwnerOrgIds: ['blocked'],
  });
  assert.equal(session.selectedMembership?.organizationId, 'ok');
  assert.equal(session.portalMode, 'none');
}

// ── blocked owner만 있는 경우: blocked org라도 선택(차단 화면용) ──
{
  const session = boot({
    memberships: [mem({ id: 'own', organizationId: 'blocked', role: 'owner' })],
    blockedOwnerOrgIds: ['blocked'],
  });
  assert.equal(session.decision.kind, 'select_organization');
  assert.equal(session.selectedMembership?.organizationId, 'blocked');
  assert.equal(session.portalMode, 'none');
}

// ── stored가 blocked owner org면 사용하지 않고 폴백 ───────────────
{
  const session = boot({
    memberships: [
      mem({ id: 'own', organizationId: 'blocked', role: 'owner' }),
      mem({ id: 'st', organizationId: 'ok', role: 'admin' }),
    ],
    blockedOwnerOrgIds: ['blocked'],
    storedOrganizationId: 'blocked',
  });
  assert.equal(session.selectedMembership?.organizationId, 'ok');
}

// ── customer-only: 포털 모드 없이 멤버십 선택 ─────────────────────
{
  const session = boot({
    memberships: [mem({ id: 'c1', organizationId: 'cust', role: 'customer' })],
  });
  assert.equal(session.flags.isCustomerOnly, true);
  assert.equal(session.selectedMembership?.organizationId, 'cust');
  assert.equal(session.portalMode, 'none');
}

// ── parent-only(legacy membership): 포털 진입 없이 선택/또는 null ─
{
  const session = boot({
    memberships: [mem({ id: 'p1', organizationId: 'par', role: 'parent' })],
    portalChildren: 1,
    parentId: 'parent-profile',
    parentPortalModeActive: true,
  });
  assert.notEqual(session.decision.kind, 'enter_parent');
  assert.equal(session.portalMode, 'none');
  // parent는 staff가 아니므로 firstUsable로 선택됨
  assert.equal(session.selectedMembership?.organizationId, 'par');
}

// ── parentPortalModeActive + staff: 워크스페이스 staff 유지 ───────
{
  const session = boot({
    memberships: [mem({ id: 'm1', organizationId: 'o1', role: 'admin' })],
    parentId: 'p1',
    parentPortalModeActive: true,
  });
  assert.equal(session.selectedMembership?.organizationId, 'o1');
  assert.equal(session.portalMode, 'none');
}

// ── staff + customer 혼합: staff 우선 (첫 staff) ───────────────────
{
  const session = boot({
    memberships: [
      mem({ id: 'c1', organizationId: 'c-org', role: 'customer' }),
      mem({ id: 's1', organizationId: 's-org', role: 'staff' }),
    ],
  });
  assert.equal(session.selectedMembership?.organizationId, 's-org');
  assert.equal(session.portalMode, 'none');
}

// ── resolveOrganizationBootstrap은 enter_parent/customer를 내지 않음 ─
{
  const cases = [
    {
      memberships: [mem({ id: 'c1', organizationId: 'o1', role: 'customer' })],
      parentPortalModeActive: false,
      parentId: null as string | null,
      portalChildren: 0,
    },
    {
      memberships: [mem({ id: 'p1', organizationId: 'o1', role: 'guardian' })],
      parentPortalModeActive: true,
      parentId: 'pid',
      portalChildren: 2,
    },
    {
      memberships: [] as OrganizationMembership[],
      parentPortalModeActive: true,
      parentId: 'pid',
      portalChildren: 1,
    },
  ];
  for (const c of cases) {
    const { decision } = resolveOrganizationBootstrap({
      memberships: c.memberships,
      blockedOwnerOrgIds: [],
      portalChildren: c.portalChildren,
      parentId: c.parentId,
      parentPortalModeActive: c.parentPortalModeActive,
      storedOrganizationId: null,
    });
    assert.notEqual(decision.kind, 'enter_parent', `unexpected enter_parent: ${JSON.stringify(c)}`);
    assert.notEqual(decision.kind, 'enter_customer', `unexpected enter_customer: ${JSON.stringify(c)}`);
  }
}

// ── 동일 org 다중 역할: organizationId 선택 시 첫 멤버십 ───────────
{
  const session = boot({
    memberships: [
      mem({ id: 'm-admin', organizationId: 'o1', role: 'admin' }),
      mem({ id: 'm-staff', organizationId: 'o1', role: 'staff' }),
    ],
    storedOrganizationId: 'o1',
  });
  assert.equal(session.selectedMembership?.organizationId, 'o1');
  assert.equal(session.selectedMembership?.id, 'm-admin');
}

console.log('organizationBootstrap.edge.test.ts: ok');
