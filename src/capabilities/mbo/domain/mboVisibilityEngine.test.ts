import assert from 'node:assert/strict';
import {
  buildRevisedGoalFlags,
  canViewMboGoal,
  filterObjectivesForViewer,
  formatRevisionHistory,
  hangulToChosung,
  memberMatchesQuery,
  nextRevisionCount,
} from './mboVisibilityEngine';

// 케이스 1: PUBLIC — 사내 구성원 열람 가능
assert.equal(
  canViewMboGoal(
    { authorId: 'u1', visibilityType: 'PUBLIC' },
    'm-other',
    'u-other',
  ),
  true,
);

// 케이스 2: PRIVATE — 타인 불가, 본인/사업주 가능
assert.equal(
  canViewMboGoal(
    { authorId: 'u1', visibilityType: 'PRIVATE' },
    'm2',
    'u2',
  ),
  false,
);
assert.equal(
  canViewMboGoal(
    { authorId: 'u1', visibilityType: 'PRIVATE' },
    'm1',
    'u1',
  ),
  true,
);
assert.equal(
  canViewMboGoal(
    { authorId: 'u1', visibilityType: 'PRIVATE' },
    'm2',
    'u2',
    { isOwnerOrAdmin: true },
  ),
  true,
);

// 케이스 3: PARTIAL — shares에 등록된 사원만
assert.equal(
  canViewMboGoal(
    {
      authorId: 'u1',
      visibilityType: 'PARTIAL',
      sharedMemberIds: ['m-alice', 'm-bob'],
    },
    'm-alice',
    'u-alice',
  ),
  true,
);
assert.equal(
  canViewMboGoal(
    {
      authorId: 'u1',
      visibilityType: 'PARTIAL',
      sharedMemberIds: ['m-alice'],
    },
    'm-carol',
    'u-carol',
  ),
  false,
);

// 케이스 4: revision_count 증분 및 diff
const flags = buildRevisedGoalFlags(2);
assert.equal(flags.isRevised, true);
assert.equal(flags.revisionCount, 3);
assert.equal(nextRevisionCount(0), 1);

const history = formatRevisionHistory(
  [
    {
      id: 'r1',
      previousTargetValue: 100,
      previousDueDate: '2026-06-30',
      unmetReason: '상반기 수요 둔화',
      revisionReason: '하반기 목표 재설정',
      revisedBy: 'u1',
      createdAt: '2026-07-01T00:00:00Z',
      changeKind: 'revise',
    },
    {
      id: 'r2',
      previousTargetValue: 80,
      previousDueDate: '2026-09-30',
      unmetReason: '인력 공백',
      revisionReason: '일정 연장',
      revisedBy: 'u1',
      createdAt: '2026-10-01T00:00:00Z',
      changeKind: 'revise',
    },
    {
      id: 'r3',
      previousTargetValue: 70,
      previousDueDate: '2026-12-31',
      previousTitle: '종료 과제',
      revisionReason: '과제 중단',
      revisedBy: 'u1',
      createdAt: '2026-11-01T00:00:00Z',
      changeKind: 'delete',
    },
  ],
  { targetValue: 70, dueDate: '2026-12-31' },
);
assert.equal(history.length, 3);
assert.equal(history[0].targetDiff, '100 → 80');
assert.equal(history[1].targetDiff, '80 → 70');
assert.equal(history[1].dueDateDiff, '2026-09-30 → 2026-12-31');
assert.equal(history[2].isDelete, true);
assert.equal(history[2].revisionReason, '과제 중단');
assert.equal(history[2].titleLabel, '종료 과제');

const mineOnly = filterObjectivesForViewer(
  [
    { ownerId: 'u1', visibilityType: 'PRIVATE' as const, deletedAt: null },
    { ownerId: 'u2', visibilityType: 'PUBLIC' as const, deletedAt: null },
    { ownerId: 'u1', visibilityType: 'PRIVATE' as const, deletedAt: '2026-01-01' },
  ],
  { scope: 'mine', currentUserId: 'u1', currentMemberId: 'm1' },
);
assert.equal(mineOnly.length, 1);
assert.equal(mineOnly[0].ownerId, 'u1');
assert.equal(mineOnly[0].deletedAt, null);

assert.ok(hangulToChosung('김민수').startsWith('ㄱ'));
assert.equal(memberMatchesQuery('김민수', 'ㄱㅁ'), true);
assert.equal(memberMatchesQuery('김민수', '이'), false);

// 케이스 4: 조직도 트리 기반 부서장 계층 열람 (상위 리더 상속 및 타 부서 차단)
const teamMemberGoal = {
  authorId: 'emp-core-1',
  visibilityType: 'PRIVATE' as const,
  authorDepartmentPath: '/root/dev/plat/core/',
};

// 4-1. 소속 팀장 열람 승인 (경로 동일)
assert.equal(
  canViewMboGoal(teamMemberGoal, 'm-lead', 'u-lead', {
    viewerLeadDepartmentPath: '/root/dev/plat/core/',
  }),
  true,
  '팀장은 소속 팀원의 PRIVATE MBO를 열람할 수 있어야 함'
);

// 4-2. 상위 그룹장/본부장 열람 승인 (경로 접두사 일치 상속)
assert.equal(
  canViewMboGoal(teamMemberGoal, 'm-director', 'u-director', {
    viewerLeadDepartmentPath: '/root/dev/plat/',
  }),
  true,
  '상위 그룹장은 하위 코어팀 팀원의 MBO를 열람할 수 있어야 함'
);

assert.equal(
  canViewMboGoal(teamMemberGoal, 'm-vp', 'u-vp', {
    viewerLeadDepartmentPath: '/root/dev/',
  }),
  true,
  '개발본부장은 산하 모든 팀원의 MBO를 열람할 수 있어야 함'
);

// 4-3. 타 본부(디자인본부) 리더의 열람 시도 차단
assert.equal(
  canViewMboGoal(teamMemberGoal, 'm-design-lead', 'u-design-lead', {
    viewerLeadDepartmentPath: '/root/design/',
  }),
  false,
  '타 본부 리더는 개발팀 팀원의 PRIVATE MBO를 열람할 수 없어야 함'
);

// 4-4. 일반 팀원 (리더 경로 없음) 열람 시도 차단
assert.equal(
  canViewMboGoal(teamMemberGoal, 'm-peer', 'u-peer', {}),
  false,
  '일반 동료 직원은 PRIVATE MBO를 열람할 수 없어야 함'
);

console.log('mboVisibilityEngine.test.ts: ok');
