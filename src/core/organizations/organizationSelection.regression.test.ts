/**
 * 사업장 선택/복원/전환 회귀 (EP_apps).
 * 실행: npm run test:org-selection
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Organization } from '../../lib/supabase';
import type { OrganizationMembership } from './services/organizationService';
import { resolveIndustryAppKind } from '../industry/industryAppResolve';
import {
  applyBootstrapToSession,
  assertSelectionInvariant,
  deriveSelectionFields,
  nextOrganizationLocalStateAction,
  resolveMembershipAfterRefresh,
  resolveMembershipByOrganizationId,
} from './resolveOrganizationContext';

function org(id: string, name: string, industryType: string): Organization {
  return {
    id,
    name,
    industry_type: industryType,
    slug: null,
    settings: {},
    is_active: true,
    public_code: '',
    created_at: '',
    updated_at: '',
  } as Organization;
}

function mem(partial: {
  id: string;
  organizationId: string;
  role: OrganizationMembership['role'];
  industry?: string;
  name?: string;
  isCurrentContext?: boolean;
}): OrganizationMembership {
  const industry = partial.industry ?? 'personal_plant_ops';
  return {
    id: partial.id,
    organizationId: partial.organizationId,
    role: partial.role,
    staffId: null,
    parentCustomerId: null,
    isCurrentContext: partial.isCurrentContext,
    organization: org(partial.organizationId, partial.name ?? partial.organizationId, industry),
  };
}

function login(input: {
  memberships: OrganizationMembership[];
  storedOrganizationId?: string | null;
  parentPortalModeActive?: boolean;
  portalChildren?: number;
  parentId?: string | null;
  blockedOwnerOrgIds?: string[];
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

function assertOrg(
  membership: OrganizationMembership | null,
  organizationId: string,
  industryType: string
) {
  assertSelectionInvariant(membership);
  assert.equal(membership?.organizationId, organizationId);
  assert.equal(membership?.organization.id, organizationId);
  assert.equal(membership?.organization.industry_type, industryType);
  const fields = deriveSelectionFields(membership);
  assert.equal(fields.currentOrganization?.id, organizationId);
  assert.equal(fields.currentOrganization?.industry_type, industryType);
}

function selectOrg(memberships: OrganizationMembership[], organizationId: string) {
  const result = resolveMembershipByOrganizationId(memberships, organizationId);
  assertSelectionInvariant(result.membership);
  return result;
}

const plantA = mem({
  id: 'm-a',
  organizationId: 'org-a',
  role: 'owner',
  industry: 'personal_plant_ops',
  name: 'A공장',
});
const plantB = mem({
  id: 'm-b',
  organizationId: 'org-b',
  role: 'admin',
  industry: 'personal_plant_ops',
  name: 'B공장',
});
const plantC = mem({
  id: 'm-c',
  organizationId: 'org-c',
  role: 'staff',
  industry: 'personal_plant_ops',
  name: 'C공장',
});

function run() {
  const here = dirname(fileURLToPath(import.meta.url));
  const contextSrc = readFileSync(join(here, 'resolveOrganizationContext.ts'), 'utf8');
  assert.equal(contextSrc.includes('industry_type'), false, '선택 로직이 industry_type에 의존하면 안 된다');
  const providerSrc = readFileSync(join(here, 'OrganizationProvider.tsx'), 'utf8');
  assert.match(providerSrc, /applyBootstrapToSession/);
  assert.match(providerSrc, /deriveSelectionFields\(selectedMembership\)/);
  assert.match(providerSrc, /nextOrganizationLocalStateAction/);
  assert.match(providerSrc, /clearStoredOrganizationId\(\)/);
  assert.match(providerSrc, /resolveMembershipAfterRefresh/);
  assert.match(providerSrc, /fetchUserMembershipsWithContext/);
  const wizardSrc = readFileSync(join(here, 'CreateOrganizationWizard.tsx'), 'utf8');
  assert.match(wizardSrc, /selectOrganization\(createdOrgId\)/);
  assert.equal(
    /refreshOrganizations[\s\S]*selectOrganization\(createdOrgId\)/.test(wizardSrc),
    false,
    '생성 직후 refresh→select 순서는 stale membership으로 실패한다'
  );

  // 1. 단일 사업장 — 로그인 자동 진입
  {
    const session = login({ memberships: [plantA] });
    assert.equal(session.portalMode, 'none');
    assertOrg(session.selectedMembership, 'org-a', 'personal_plant_ops');
    assert.equal(session.storedOrganizationId, 'org-a');
    assert.equal(
      resolveIndustryAppKind(session.selectedMembership?.organization.industry_type),
      'generic'
    );
  }

  // 2. 두 사업장 — 복원 / 전환
  {
    const both = [plantA, plantB];
    const restored = login({ memberships: both, storedOrganizationId: 'org-b' });
    assertOrg(restored.selectedMembership, 'org-b', 'personal_plant_ops');

    const toA = selectOrg(both, 'org-a');
    assertOrg(toA.membership, 'org-a', 'personal_plant_ops');
    assert.equal(toA.storage.action, 'store');
    if (toA.storage.action === 'store') {
      assert.equal(toA.storage.organizationId, 'org-a');
    }
    assert.equal(
      nextOrganizationLocalStateAction(restored.selectedMembership?.organizationId, 'org-a'),
      'clear'
    );

    const back = selectOrg(both, 'org-b');
    assertOrg(back.membership, 'org-b', 'personal_plant_ops');
    assert.notEqual(back.membership?.organizationId, 'org-a');
  }

  // 3. 세 사업장 — id가 뒤섞이지 않음
  {
    const three = [plantA, plantB, plantC];
    const picks = ['org-a', 'org-b', 'org-c'];
    let previousId: string | null = null;
    for (const id of picks) {
      const result = selectOrg(three, id);
      assertOrg(result.membership, id, 'personal_plant_ops');
      for (const m of three.filter((x) => x.organizationId !== id)) {
        assert.notEqual(result.membership?.organizationId, m.organizationId);
      }
      if (previousId) {
        assert.equal(nextOrganizationLocalStateAction(previousId, id), 'clear');
      }
      previousId = id;
    }
  }

  // 4. stored id는 있는데 membership이 사라짐
  {
    const staleSingle = login({
      memberships: [plantA],
      storedOrganizationId: 'org-gone',
    });
    assertOrg(staleSingle.selectedMembership, 'org-a', 'personal_plant_ops');

    const staleMulti = login({
      memberships: [plantA, plantB],
      storedOrganizationId: 'org-gone',
    });
    // EP_apps: 선택 화면 없이 첫 가용 멤버십으로 자동 진입
    assertOrg(staleMulti.selectedMembership, 'org-a', 'personal_plant_ops');
    assertSelectionInvariant(staleMulti.selectedMembership);
  }

  // 5. current context membership
  {
    const contextB = { ...plantB, isCurrentContext: true };
    const session = login({
      memberships: [plantA, contextB],
      storedOrganizationId: 'org-a',
    });
    assert.equal(session.decision.kind, 'select_membership');
    assertOrg(session.selectedMembership, 'org-b', 'personal_plant_ops');
  }

  // 6. 로그아웃 후 다른 계정
  {
    const accountA = login({ memberships: [plantA] });
    assertOrg(accountA.selectedMembership, 'org-a', 'personal_plant_ops');
    const accountB = login({
      memberships: [plantB],
      storedOrganizationId: null,
    });
    assertOrg(accountB.selectedMembership, 'org-b', 'personal_plant_ops');
    assert.notEqual(accountB.selectedMembership?.organizationId, 'org-a');
  }

  // 7. 신규 생성 직후
  {
    const created = mem({
      id: 'm-new',
      organizationId: 'org-new',
      role: 'owner',
      industry: 'personal_plant_ops',
      name: '신규현장',
    });
    const stale = resolveMembershipByOrganizationId([], 'org-new');
    assert.equal(stale.membership, null);
    const afterRefresh = resolveMembershipAfterRefresh([], [created], 'org-new');
    assertOrg(afterRefresh.membership, 'org-new', 'personal_plant_ops');
    assert.equal(afterRefresh.storage.action, 'store');
    const missing = resolveMembershipAfterRefresh([], [plantA], 'org-new');
    assert.equal(missing.membership, null);
  }

  assert.equal(nextOrganizationLocalStateAction('org-a', 'org-a'), 'keep');
  assert.equal(resolveIndustryAppKind('personal_plant_ops'), 'generic');
  assert.equal(resolveIndustryAppKind('piano'), 'generic');

  console.log('organizationSelection.regression.test.ts: ok');
}

run();
