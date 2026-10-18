/**
 * useStaffScope 및 부서 단위 데이터 스코프 격리 단위 테스트
 *
 * 검증 대상:
 *  1. 팀장(manager) 부서 단위 데이터 스코프 격리 (자신의 부서만 조회 및 재배정)
 *  2. 최고 관리자(super_admin, director, owner) 전사 부서 조회 및 전체 승인
 *  3. 일반 직원(staff, worker, driver) 스코프 정책 검증
 */

import assert from 'node:assert/strict';
import {
  isDepartmentScoped,
  filterByDepartmentScope,
  checkCanReassignTask,
} from './useStaffScope';

console.log('[test:staff-scope] starting useStaffScope suite...');

interface MockStaffItem {
  id: string;
  name: string;
  department_id?: string | null;
}

interface MockRequestItem {
  id: string;
  requester_name: string;
  department_id?: string | null;
}

const SAMPLE_STAFF: MockStaffItem[] = [
  { id: 's1', name: '김연구', department_id: 'dept_rnd' },
  { id: 's2', name: '이개발', department_id: 'dept_rnd' },
  { id: 's3', name: '박영업', department_id: 'dept_sales' },
  { id: 's4', name: '최인사', department_id: 'dept_hr' },
  { id: 's5', name: '정무소속', department_id: null },
];

const SAMPLE_REQUESTS: MockRequestItem[] = [
  { id: 'req_1', requester_name: '김연구', department_id: 'dept_rnd' },
  { id: 'req_2', requester_name: '박영업', department_id: 'dept_sales' },
  { id: 'req_3', requester_name: '이개발', department_id: 'dept_rnd' },
];

// 1. 팀장(manager) 권한 검증: 본인 소속 부서(dept_rnd)만 격리 조회
{
  const role = 'manager';
  const myDept = 'dept_rnd';
  const isScoped = isDepartmentScoped(role);
  assert.equal(isScoped, true, '팀장(manager)은 부서 격리 대상이어야 함');

  // 직원 목록 필터링: 오직 dept_rnd만 나와야 함
  const scopedStaff = filterByDepartmentScope(SAMPLE_STAFF, isScoped, myDept);
  assert.equal(scopedStaff.length, 2, 'R&D 팀장은 R&D 부서원 2명만 조회되어야 함');
  assert.ok(scopedStaff.every((s) => s.department_id === 'dept_rnd'), '타 부서 직원 노출 차단');

  // 요청 목록 필터링
  const scopedRequests = filterByDepartmentScope(SAMPLE_REQUESTS, isScoped, myDept);
  assert.equal(scopedRequests.length, 2, 'R&D 팀장은 R&D 소속 요청 2건만 조회되어야 함');
  assert.ok(scopedRequests.every((r) => r.department_id === 'dept_rnd'), '타 부서 요청 노출 차단');

  // 업무 재배정(canReassignTask) 권한 검사
  assert.equal(
    checkCanReassignTask(isScoped, myDept, 'dept_rnd'),
    true,
    '팀장은 자기 부서 소속 직원에게 업무 재배정 가능'
  );
  assert.equal(
    checkCanReassignTask(isScoped, myDept, 'dept_sales'),
    false,
    '팀장은 타 부서(영업팀) 직원에게 업무 재배정 불가'
  );
  assert.equal(
    checkCanReassignTask(isScoped, myDept, null),
    false,
    '부서가 없는 대상에게는 팀장 재배정 불가'
  );
}
console.log('✓ 1. 팀장(manager) 부서 단위 데이터 격리 및 타 부서 차단 검증 완료');

// 2. 최고 관리자(super_admin, director, owner) 전사 조회 및 전 부서 승인/재배정 권한 검증
{
  const adminRoles = ['super_admin', 'director', 'owner', 'admin'];

  for (const role of adminRoles) {
    const isScoped = isDepartmentScoped(role);
    assert.equal(isScoped, false, `${role}은 부서 격리 대상이 아니어야 함 (전사 스코프)`);

    // 직원 목록: 필터링 없이 전체 5명 반환
    const scopedStaff = filterByDepartmentScope(SAMPLE_STAFF, isScoped, null);
    assert.equal(scopedStaff.length, SAMPLE_STAFF.length, `${role}은 전사 직원 전체 조회 가능`);

    // 요청 목록: 필터링 없이 전체 반환
    const scopedRequests = filterByDepartmentScope(SAMPLE_REQUESTS, isScoped, null);
    assert.equal(scopedRequests.length, SAMPLE_REQUESTS.length, `${role}은 전사 요청 전체 조회 가능`);

    // 업무 재배정: 모든 부서에 대해 재배정 권한 보유
    assert.equal(
      checkCanReassignTask(isScoped, null, 'dept_rnd'),
      true,
      `${role}은 R&D팀 업무 재배정 가능`
    );
    assert.equal(
      checkCanReassignTask(isScoped, null, 'dept_sales'),
      true,
      `${role}은 영업팀 업무 재배정 가능`
    );
    assert.equal(
      checkCanReassignTask(isScoped, null, 'dept_hr'),
      true,
      `${role}은 인사팀 업무 재배정 가능`
    );
  }
}
console.log('✓ 2. 최고 관리자(super_admin, director, owner) 전사 부서 조회 및 전체 승인 검증 완료');

// 3. 일반 직원 및 특수 직무(staff, worker, driver) 스코프 검증
{
  assert.equal(isDepartmentScoped('staff'), false, '일반 직원은 부서 관리 스코프가 아님');
  assert.equal(isDepartmentScoped('worker'), false, '현장 작업자는 부서 관리 스코프가 아님');
  assert.equal(isDepartmentScoped('driver'), false, '운전기사는 부서 관리 스코프가 아님');
}
console.log('✓ 3. 일반 직원 및 특수 직무 스코프 검증 완료');

console.log('[test:staff-scope] all test cases passed successfully!');
