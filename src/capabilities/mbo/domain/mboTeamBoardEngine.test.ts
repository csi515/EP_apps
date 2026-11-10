import assert from 'node:assert/strict';
import { buildPersonObjectiveBuckets } from './mboTeamBoardEngine';

const base = {
  status: 'in_progress',
  startDate: '2026-01-01',
  targetDate: '2026-12-31',
  weight: 50,
  progressRate: 40,
  departmentName: '개발',
} as const;

const rows = [
  {
    id: 'a1',
    parentId: null,
    level: 'department' as const,
    ownerId: 'u1',
    ownerName: '홍길동',
    title: '부서 목표',
    ...base,
  },
  {
    id: 'a2',
    parentId: 'a1',
    level: 'individual' as const,
    ownerId: 'u1',
    ownerName: '홍길동',
    title: '개인 KPI',
    ...base,
    weight: 50,
  },
  {
    id: 'b1',
    parentId: null,
    level: 'individual' as const,
    ownerId: 'u2',
    ownerName: '김철수',
    title: '팀원 목표',
    ...base,
  },
];

const buckets = buildPersonObjectiveBuckets(rows, { viewerUserId: 'u1' });
assert.equal(buckets.length, 2);
assert.equal(buckets[0]!.isViewer, true);
assert.equal(buckets[0]!.ownerName, '홍길동');
assert.equal(buckets[0]!.flattened.length, 2);
assert.equal(buckets[0]!.flattened[1]!.depth, 1);

const filtered = buildPersonObjectiveBuckets(rows, { viewerUserId: 'u1', personQuery: '철' });
assert.equal(filtered.length, 1);
assert.equal(filtered[0]!.ownerName, '김철수');

console.log('mboTeamBoardEngine.test.ts OK');
