/**
 * Zero-Config Role Matrix Unit Tests.
 */

import assert from 'node:assert/strict';
import {
  getZeroConfigRoleTemplates,
  generateDefaultTenantRoles,
} from './roleMatrix';

function runRoleMatrixTests(): void {
  console.log('🧪 [Test Suite] Zero-Config Role Matrix & RBAC Invariants\n');

  // Test 1: 기본 4대 직급 템플릿 검증
  {
    console.log('  ▶ Test 1: 4대 표준 직급 (owner, manager, instructor, staff) 생성');
    const roles = getZeroConfigRoleTemplates('piano');
    assert.equal(roles.length, 4, '4개의 기본 직급이 제공되어야 함');

    const [owner, manager, instructor, staff] = roles;
    assert.equal(owner.code, 'owner');
    assert.equal(manager.code, 'manager');
    assert.equal(instructor.code, 'instructor');
    assert.equal(staff.code, 'staff');

    assert.ok(owner.rank_order < manager.rank_order);
    assert.ok(manager.rank_order < instructor.rank_order);
    assert.ok(instructor.rank_order < staff.rank_order);
    console.log('    ✓ 통과');
  }

  // Test 2: 민감 재무 권한 차단 검증 (Zero-Config Security Invariant)
  {
    console.log('  ▶ Test 2: 스태프 및 강사의 민감 재무 장부(settlement:*) 원천 차단 검증');
    const roles = getZeroConfigRoleTemplates('gym');
    const staff = roles.find((r) => r.code === 'staff')!;
    const instructor = roles.find((r) => r.code === 'instructor')!;

    // 1. staff 권한 검증: 출결 및 회원 조회만 가능, 재무 일절 없음
    assert.ok(staff.permissions.includes('attendance:checkin'), '출결 체크인은 가능해야 함');
    assert.ok(staff.permissions.includes('roster:view'), '회원 단순 조회는 가능해야 함');
    assert.ok(!staff.permissions.includes('settlement:view'), '매출/장부 조회는 차단되어야 함');
    assert.ok(!staff.permissions.includes('billing:invoice'), '청구서 발행은 차단되어야 함');
    assert.ok(!staff.permissions.includes('passes:delete'), '이용권 삭제는 차단되어야 함');

    // 2. instructor 권한 검증: 상담/학습일지 작성 가능, 재무 장부 차단
    assert.ok(instructor.permissions.includes('consultation:write'), '상담 일지 작성 가능해야 함');
    assert.ok(instructor.permissions.includes('learning_journal:write'), '학습 일지 작성 가능해야 함');
    assert.ok(!instructor.permissions.includes('settlement:view'), '총매출 장부 열람은 차단되어야 함');
    assert.ok(!instructor.permissions.includes('billing:invoice'), '청구서 발행은 차단되어야 함');
    console.log('    ✓ 통과: 데스크 및 강사의 재무 권한 누수 원천 방어 확인');
  }

  // Test 3: 업종별 직급 명칭 맞춤 치환 검증
  {
    console.log('  ▶ Test 3: 업종별(필라테스, 뷰티, 외식, 학원) 직급 명칭 현지화');
    const pilatesRoles = getZeroConfigRoleTemplates('pilates');
    assert.ok(pilatesRoles[2].name.includes('트레이너'), '필라테스는 트레이너로 표기');

    const beautyRoles = getZeroConfigRoleTemplates('skin_clinic');
    assert.ok(beautyRoles[2].name.includes('디자이너') || beautyRoles[2].name.includes('시술사'), '뷰티는 디자이너/시술사로 표기');

    const cafeRoles = getZeroConfigRoleTemplates('cafe');
    assert.ok(cafeRoles[2].name.includes('바리스타') || cafeRoles[2].name.includes('조리'), '카페는 바리스타로 표기');
    console.log('    ✓ 통과');
  }

  // Test 4: generateDefaultTenantRoles 테넌트 레코드 생성
  {
    console.log('  ▶ Test 4: 테넌트 초기 직급 레코드 생성');
    const records = generateDefaultTenantRoles('tenant-academy-01', 'taekwondo');
    assert.equal(records.length, 4);
    assert.equal(records[0].tenant_id, 'tenant-academy-01');
    assert.ok(records[0].permissions.length > 10);
    console.log('    ✓ 통과');
  }

  console.log('\n✨ All Zero-Config Role Matrix tests passed cleanly!\n');
}

runRoleMatrixTests();
