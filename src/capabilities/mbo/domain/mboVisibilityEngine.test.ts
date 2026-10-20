import assert from 'node:assert/strict';
import {
  buildRevisedGoalFlags,
  canViewMboGoal,
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
    },
    {
      id: 'r2',
      previousTargetValue: 80,
      previousDueDate: '2026-09-30',
      unmetReason: '인력 공백',
      revisionReason: '일정 연장',
      revisedBy: 'u1',
      createdAt: '2026-10-01T00:00:00Z',
    },
  ],
  { targetValue: 70, dueDate: '2026-12-31' },
);
assert.equal(history.length, 2);
assert.equal(history[0].targetDiff, '100 → 80');
assert.equal(history[1].targetDiff, '80 → 70');
assert.equal(history[1].dueDateDiff, '2026-09-30 → 2026-12-31');

assert.ok(hangulToChosung('김민수').startsWith('ㄱ'));
assert.equal(memberMatchesQuery('김민수', 'ㄱㅁ'), true);
assert.equal(memberMatchesQuery('김민수', '이'), false);

console.log('mboVisibilityEngine.test.ts: ok');
