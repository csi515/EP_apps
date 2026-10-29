/**
 * 역할 라벨 · 섹션 라벨 엣지 케이스 (학원 호칭 노출 방지)
 * 실행: npm run test:role-labels-edge
 */
import assert from 'node:assert/strict';
import { getRoleLabel } from './services/organizationService';
import {
  isManagerLikeRole,
  isStaffLikeRole,
  roleSectionLabel,
  switchErrorMessage,
} from './roleContextHelpers';
import type { MemberRole } from '@/lib/supabase';

console.log('[test:role-labels-edge] start');

const ACADEMY_WORDS = [/원장/, /강사/, /학부모/, /원생/, /수강생/];

function assertNoAcademyWording(label: string, ctx: string) {
  for (const re of ACADEMY_WORDS) {
    assert.equal(re.test(label), false, `${ctx} must not contain academy wording: ${label}`);
  }
}

// 업종 미지정 기본값
{
  const roles: MemberRole[] = [
    'owner',
    'admin',
    'manager',
    'staff',
    'instructor',
    'member',
    'customer',
    'parent',
    'guardian',
  ];
  for (const role of roles) {
    const label = getRoleLabel(role, null);
    assert.ok(label.length > 0, `empty label for ${role}`);
    assertNoAcademyWording(label, `getRoleLabel(${role}, null)`);
    assertNoAcademyWording(roleSectionLabel(role, null), `roleSectionLabel(${role}, null)`);
  }
  assert.equal(getRoleLabel('staff', null), '직원');
  assert.equal(getRoleLabel('instructor', null), '직원');
  assert.equal(getRoleLabel('parent', null), '보호자');
  assert.equal(roleSectionLabel('staff', null), '직원 활동');
  assert.equal(roleSectionLabel('parent', null), '보호자');
  assert.equal(roleSectionLabel('guardian', null), '보호자');
}

// personal_plant_ops
{
  assert.equal(getRoleLabel('staff', 'personal_plant_ops'), '직원');
  assert.equal(getRoleLabel('owner', 'personal_plant_ops'), '대표이사');
  assert.equal(getRoleLabel('admin', 'personal_plant_ops'), '관리자');
  assertNoAcademyWording(getRoleLabel('parent', 'personal_plant_ops'), 'parent/plant');
  assert.equal(roleSectionLabel('parent', 'personal_plant_ops'), '보호자');
  assert.equal(roleSectionLabel('owner', 'personal_plant_ops'), '사업장 관리');
  assert.equal(roleSectionLabel('admin', 'personal_plant_ops'), '사업장 관리');
  assert.equal(roleSectionLabel('manager', 'personal_plant_ops'), '사업장 관리');
}

// alias / 빈 문자열
{
  assert.equal(getRoleLabel('staff', ''), '직원');
  assert.equal(getRoleLabel('staff', undefined), '직원');
  assert.equal(roleSectionLabel('member', null), '멤버');
  assert.equal(roleSectionLabel('customer', null), '멤버');
}

// role helpers
{
  assert.equal(isManagerLikeRole('owner'), true);
  assert.equal(isManagerLikeRole('admin'), true);
  assert.equal(isManagerLikeRole('manager'), true);
  assert.equal(isManagerLikeRole('staff'), false);
  assert.equal(isStaffLikeRole('staff'), true);
  assert.equal(isStaffLikeRole('instructor'), true);
  assert.equal(isStaffLikeRole('owner'), false);
}

// switchErrorMessage 네트워크 / 일반
{
  assert.match(switchErrorMessage(new TypeError('Failed to fetch')), /네트워크/);
  assert.match(switchErrorMessage(new Error('network offline')), /네트워크/);
  assert.equal(switchErrorMessage(new Error('권한 없음')), '권한 없음');
  assert.match(switchErrorMessage('x'), /전환에 실패|x/);
  assert.match(switchErrorMessage(null), /전환에 실패/);
}

console.log('roleLabels.edge.test.ts: ok');
