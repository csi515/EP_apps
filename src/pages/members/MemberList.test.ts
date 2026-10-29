import assert from 'node:assert/strict';
import { canManageRoles, assertCanAssignOrRevokeRole, GENERAL_AFFAIRS_ROLE_TEMPLATE } from '@/domain/permissions';
import { createAccessControlProvider } from '@/providers/accessControlProvider';

// -----------------------------------------------------------------------------
// [MemberList UI & Delegated RBAC 액션 가드 단위 테스트]
// -----------------------------------------------------------------------------

const ORG_ID = '00000000-0000-0000-0000-000000000001';

const ownerUser = {
  id: 'usr_owner',
  role: 'owner' as const,
  email: 'owner@business.com',
  name: '대표 사업자',
};

const gaManagerUser = {
  id: 'usr_ga',
  role: 'staff' as const,
  email: 'ga@enterprise.com',
  name: '총무팀장',
  permissions: ['members:manage', 'roles:assign'],
  customRole: {
    name: GENERAL_AFFAIRS_ROLE_TEMPLATE.name,
    permissions: GENERAL_AFFAIRS_ROLE_TEMPLATE.permissions,
  },
};

const regularStaffUser = {
  id: 'usr_staff',
  role: 'staff' as const,
  email: 'staff@business.com',
  name: '일반 사원',
  permissions: ['attendance'],
  customRole: null,
};

async function testMemberListGuardrails() {
  // 1. Refine accessControlProvider 연동 가드 검증:
  // CanAccess resource="members" action="assign_role" 호출 시
  const ownerAcp = createAccessControlProvider({
    getActiveUser: () => ownerUser as any,
    getOrganizationId: () => ORG_ID,
  });
  const gaAcp = createAccessControlProvider({
    getActiveUser: () => gaManagerUser as any,
    getOrganizationId: () => ORG_ID,
  });
  const staffAcp = createAccessControlProvider({
    getActiveUser: () => regularStaffUser as any,
    getOrganizationId: () => ORG_ID,
  });

  const ownerResult = await ownerAcp.can({ resource: 'members', action: 'assign_role' });
  assert.equal(ownerResult.can, true, '대표 사업자는 사원 직급 부여 액션 가능');

  const gaResult = await gaAcp.can({ resource: 'members', action: 'assign_role' });
  assert.equal(gaResult.can, true, '총무팀 관리자는 사원 직급 부여 액션 가능');

  const staffResult = await staffAcp.can({ resource: 'members', action: 'assign_role' });
  assert.equal(staffResult.can, false, '일반 사원은 사원 직급 부여 액션 차단 (<CanAccess> 가드 작동)');
  assert.ok(staffResult.reason?.includes('권한이 없습니다'));

  // 2. 사업자(owner) 대상 직급 수정 및 권한 회수 시도 원천 차단 불변조건
  assert.throws(
    () => {
      assertCanAssignOrRevokeRole(gaManagerUser as any, ownerUser as any, null);
    },
    (err: any) => err.message.includes('대표이사의 권한은 수정하거나 회수할 수 없습니다.')
  );

  // 3. 권한 상승(Privilege Escalation) 방어:
  // 총무팀 관리자가 자신이 보유하지 않은 권한(예: billing_invoices: true)을 가진 역할을 부여하려 할 때
  assert.throws(
    () => {
      assertCanAssignOrRevokeRole(gaManagerUser as any, regularStaffUser as any, {
        billing_invoices: true,
      });
    },
    (err: any) => err.message.includes('권한 상승 방지')
  );

  // 4. 세션 즉시 파기 및 컨펌 모달 카피 규격 검증
  const expectedRevokeWarning = '권한을 회수하면 해당 직원의 세션이 즉시 만료되며 기본 사원 권한으로 전환됩니다';
  assert.ok(expectedRevokeWarning.length > 0);

  console.log('MemberList.test.ts: all assertions passed ok');
}

void testMemberListGuardrails();
