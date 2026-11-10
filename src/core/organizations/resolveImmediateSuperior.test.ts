/**
 * 실행: npx tsx src/core/organizations/resolveImmediateSuperior.test.ts
 */
import assert from 'node:assert/strict';
import { resolveImmediateSuperior } from './resolveImmediateSuperior';

const departments = [
  { id: 'root', name: '본사', parentId: null },
  { id: 'group', name: '생산그룹', parentId: 'root' },
  { id: 'team', name: '1팀', parentId: 'group' },
];

const members = [
  { id: 'm-ceo', userId: 'u-ceo', displayName: '대표', roleName: '대표이사' },
  { id: 'm-group', userId: 'u-group', displayName: '김그룹장', roleName: '그룹장' },
  { id: 'm-team', userId: 'u-team', displayName: '이팀장', roleName: '팀장' },
  { id: 'm-staff', userId: 'u-staff', displayName: '박사원', roleName: '사원' },
];

// 팀원 → 직속 팀장
{
  const result = resolveImmediateSuperior({
    viewerMemberId: 'm-staff',
    departments,
    members,
    placements: [
      { memberId: 'm-staff', departmentId: 'team', scopeType: 'SELF_ONLY' },
      { memberId: 'm-team', departmentId: 'team', scopeType: 'DESCENDANTS' },
      { memberId: 'm-group', departmentId: 'group', scopeType: 'DESCENDANTS' },
    ],
  });
  assert.equal(result.status, 'found');
  assert.equal(result.superior?.displayName, '이팀장');
  assert.equal(result.superior?.departmentName, '1팀');
  assert.equal(result.viewerDepartmentName, '1팀');
}

// 팀장(본인 DESCENDANTS) → 부모 그룹장
{
  const result = resolveImmediateSuperior({
    viewerMemberId: 'm-team',
    departments,
    members,
    placements: [
      { memberId: 'm-team', departmentId: 'team', scopeType: 'DESCENDANTS' },
      { memberId: 'm-group', departmentId: 'group', scopeType: 'DESCENDANTS' },
    ],
  });
  assert.equal(result.status, 'found');
  assert.equal(result.superior?.displayName, '김그룹장');
  assert.equal(result.superior?.departmentName, '생산그룹');
}

// 팀 리더 공석 → 그룹장으로 건너뜀
{
  const result = resolveImmediateSuperior({
    viewerMemberId: 'm-staff',
    departments,
    members,
    placements: [
      { memberId: 'm-staff', departmentId: 'team', scopeType: 'SELF_ONLY' },
      { memberId: 'm-group', departmentId: 'group', scopeType: 'DESCENDANTS' },
    ],
  });
  assert.equal(result.status, 'found');
  assert.equal(result.superior?.displayName, '김그룹장');
}

// 소속 부서 없음
{
  const result = resolveImmediateSuperior({
    viewerMemberId: 'm-staff',
    departments,
    members,
    placements: [],
  });
  assert.equal(result.status, 'no_department');
  assert.equal(result.superior, null);
}

// 최상위 리더
{
  const result = resolveImmediateSuperior({
    viewerMemberId: 'm-ceo',
    departments,
    members,
    placements: [{ memberId: 'm-ceo', departmentId: 'root', scopeType: 'DESCENDANTS' }],
  });
  assert.equal(result.status, 'self_is_top');
  assert.equal(result.superior, null);
}

// 소속은 있으나 리더 미지정
{
  const result = resolveImmediateSuperior({
    viewerMemberId: 'm-staff',
    departments,
    members,
    placements: [{ memberId: 'm-staff', departmentId: 'team', scopeType: 'SELF_ONLY' }],
  });
  assert.equal(result.status, 'none');
  assert.equal(result.superior, null);
}

// 동일 부서 DESCENDANTS 복수 → memberId 정렬 첫 사람
{
  const result = resolveImmediateSuperior({
    viewerMemberId: 'm-staff',
    departments,
    members: [
      ...members,
      { id: 'm-team-b', userId: 'u-team-b', displayName: '최팀장', roleName: '팀장' },
    ],
    placements: [
      { memberId: 'm-staff', departmentId: 'team', scopeType: 'SELF_ONLY' },
      { memberId: 'm-team-b', departmentId: 'team', scopeType: 'DESCENDANTS' },
      { memberId: 'm-team', departmentId: 'team', scopeType: 'DESCENDANTS' },
    ],
  });
  assert.equal(result.status, 'found');
  assert.equal(result.superior?.memberId, 'm-team');
}

console.log('resolveImmediateSuperior.test.ts: ok');
