/**
 * [슈퍼 어드민 테넌트 종합 관제 콘솔] 단위 및 비즈니스 로직 테스트
 */
import assert from 'node:assert';
import { isSuperAdmin } from '@/core/auth/superAdminAuth';
import {
  calculateNewExpiryDate,
  determineSubscriptionStatus,
} from '@/services/admin/adminTenantService';
import {
  startImpersonation,
  stopImpersonation,
  getImpersonationState,
} from '@/core/auth/impersonationCoordinator';
import {
  logAdminAuditAction,
  getLocalAdminAuditLogs,
} from '@/services/admin/adminAuditLogService';
import {
  calculateAddonBilling,
  getAvailableAddonCapabilities,
  validateAddonAddition,
  validateAddonRemoval,
  mergeEffectiveCapabilities,
} from '@/services/admin/tenantAddonEngine';

console.log('[test:admin-tenant-console] starting test suite...');

// 1. 최고 관리자 권한(RBAC) 판별 검증
{
  // 1-1) 일반 사용자 차단
  const normalUser = {
    id: 'user_1',
    email: 'normal@store.kr',
    app_metadata: {},
    user_metadata: {},
  } as any;
  assert.strictEqual(isSuperAdmin(normalUser), false, '일반 사용자는 슈퍼 어드민이 아니어야 함');

  // 1-2) app_metadata.is_super_admin = true
  const superAdmin1 = {
    id: 'user_2',
    email: 'operator@moa.io',
    app_metadata: { is_super_admin: true },
    user_metadata: {},
  } as any;
  assert.strictEqual(isSuperAdmin(superAdmin1), true, 'app_metadata에 is_super_admin 플래그가 있으면 승인');

  // 1-3) app_metadata.role = 'super_admin'
  const superAdmin2 = {
    id: 'user_3',
    email: 'dev@service.io',
    app_metadata: { role: 'super_admin' },
    user_metadata: {},
  } as any;
  assert.strictEqual(isSuperAdmin(superAdmin2), true, 'role이 super_admin이면 승인');

  // 1-4) 최고 관리자 사전 정의 이메일
  const superAdmin3 = {
    id: 'user_4',
    email: 'admin@moa.io',
    app_metadata: {},
    user_metadata: {},
  } as any;
  assert.strictEqual(isSuperAdmin(superAdmin3), true, '관리자 기본 이메일(admin@moa.io)은 승인');
}
console.log('✓ 1. 최고 관리자 RBAC 접근 권한 판별 검증 완료');

// 2. 만료일 연장(계좌이체 수동 납부 확인) 계산 검증
{
  const baseDate = new Date('2026-10-18T12:00:00Z');

  // 2-1) 기존 만료일이 없는 경우 (첫 결제/체험 전환): 오늘 + 1개월
  const newExpiry1 = calculateNewExpiryDate(null, 1, baseDate);
  assert.strictEqual(newExpiry1, '2026-11-18', '기존 만료일 없을 시 기준일 + 1개월');

  // 2-2) 기존 만료일이 이미 지난 경우 (연체 중): 오늘 + 3개월
  const overdueExpiry = '2026-08-15';
  const newExpiry2 = calculateNewExpiryDate(overdueExpiry, 3, baseDate);
  assert.strictEqual(newExpiry2, '2027-01-18', '만료일 지난 경우 오늘부터 3개월 연장');

  // 2-3) 기존 만료일이 미래인 경우 (선납 갱신): 기존 만료일 + 12개월 (1년)
  const activeExpiry = '2026-12-31';
  const newExpiry3 = calculateNewExpiryDate(activeExpiry, 12, baseDate);
  assert.strictEqual(newExpiry3, '2027-12-31', '기존 만료일 기준 12개월 추가');
}
console.log('✓ 2. 수동 납부 확인 및 만료일 계산 검증 완료');

// 3. 구독 상태(Active / Overdue / Trial) 판별 검증
{
  const now = new Date('2026-10-18T12:00:00Z');

  // 3-1) Free Trial + 기간 남음 -> Trial
  const statusTrial = determineSubscriptionStatus('Free Trial', '2026-10-25', now);
  assert.strictEqual(statusTrial, 'Trial');

  // 3-2) Free Trial + 기간 지남 -> Overdue
  const statusTrialOverdue = determineSubscriptionStatus('Free Trial', '2026-10-10', now);
  assert.strictEqual(statusTrialOverdue, 'Overdue');

  // 3-3) Pro 플랜 + 기간 남음 -> Active
  const statusProActive = determineSubscriptionStatus('Pro', '2026-11-30', now);
  assert.strictEqual(statusProActive, 'Active');

  // 3-4) Pro 플랜 + 기간 지남 -> Overdue
  const statusProOverdue = determineSubscriptionStatus('Pro', '2026-09-30', now);
  assert.strictEqual(statusProOverdue, 'Overdue');
}
console.log('✓ 3. 구독 상태 판별 검증 완료');

// 4. 대리 접속(Impersonation) 코디네이터 검증
{
  // Node.js 환경에서 sessionStorage 모의(Mock)
  if (typeof window === 'undefined') {
    const memoryStore: Record<string, string> = {};
    (globalThis as any).sessionStorage = {
      getItem: (k: string) => memoryStore[k] || null,
      setItem: (k: string, v: string) => {
        memoryStore[k] = v;
      },
      removeItem: (k: string) => {
        delete memoryStore[k];
      },
    };
    (globalThis as any).localStorage = {
      setItem: () => {},
      getItem: () => null,
      removeItem: () => {},
    };
  }

  // 대리 접속 시작
  startImpersonation('org_test_123', '피아노 학원 강남점', 'admin@moa.io');
  const stateActive = getImpersonationState();
  assert.strictEqual(stateActive.isActive, true, '대리 접속 활성화 확인');
  assert.strictEqual(stateActive.orgId, 'org_test_123');
  assert.strictEqual(stateActive.orgName, '피아노 학원 강남점');
  assert.strictEqual(stateActive.adminEmail, 'admin@moa.io');

  // 대리 접속 종료
  stopImpersonation();
  const stateStopped = getImpersonationState();
  assert.strictEqual(stateStopped.isActive, false, '대리 접속 정상 종료 확인');
}
console.log('✓ 4. 대리 접속(Impersonation) 코디네이터 검증 완료');

// 5. 관리자 활동 감사 로그 검증
{
  const auditPromise = logAdminAuditAction({
    adminId: 'admin@moa.io',
    action: 'SUSPEND_TENANT',
    targetOrgId: 'org_test_123',
    targetOrgName: '피아노 학원 강남점',
    details: { reason: '서비스 이용약관 위반 긴급 정지' },
  });

  assert.ok(auditPromise instanceof Promise, '감사 로그 프로미스 반환');
}
console.log('✓ 5. 관리자 활동 감사 로그 검증 완료');

// 6. 테넌트 유료 애드온 및 월 청구 요금 자동 산출 검증
{
  // 6-1) Pro 플랜 + 애드온 3개 (기본 29,000 + 60,000 = 89,000원)
  const billingPro = calculateAddonBilling('Pro', ['approval_workflow', 'resources', 'patent_ip_asset']);
  assert.strictEqual(billingPro.base_fee, 29000);
  assert.strictEqual(billingPro.addons_total, 60000);
  assert.strictEqual(billingPro.total_monthly_fee, 89000, 'Pro 플랜 + 3개 애드온 = 월 89,000원');

  // 6-2) Free Trial 플랜 (기본 0 + 애드온 1개 = 20,000원)
  const billingTrial = calculateAddonBilling('Free Trial', ['resources']);
  assert.strictEqual(billingTrial.base_fee, 0);
  assert.strictEqual(billingTrial.total_monthly_fee, 20000);

  // 6-3) 프리셋 기본 기능 및 애드온 안전 합집합 병합 검증
  const presetCaps = ['attendance', 'passes', 'roster'];
  const customAddons = ['resources', 'patent_ip_asset'];
  const merged = mergeEffectiveCapabilities(presetCaps, customAddons);
  assert.strictEqual(merged.length, 5);
  assert.ok(merged.includes('attendance'));
  assert.ok(merged.includes('resources'));
  assert.ok(merged.includes('patent_ip_asset'));

  // 6-4) 애드온 추가/삭제 유효성 검증
  const addCheck = validateAddonAddition('patent_ip_asset', ['resources'], presetCaps);
  assert.strictEqual(addCheck.valid, true);

  const duplicateCheck = validateAddonAddition('resources', ['resources'], presetCaps);
  assert.strictEqual(duplicateCheck.valid, false, '중복 애드온 추가 차단');

  const presetOverlapCheck = validateAddonAddition('attendance', ['resources'], presetCaps);
  assert.strictEqual(presetOverlapCheck.valid, false, '프리셋 기본 기능 애드온 추가 차단');
}
console.log('✓ 6. 테넌트 유료 애드온 및 월 청구 요금 자동 산출 검증 완료');

console.log('[test:admin-tenant-console] ALL TESTS PASSED! (100%)');
