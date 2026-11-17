/**
 * 실행: npx tsx src/capabilities/mbo/domain/mboOrgAlignedTreeEngine.test.ts
 */
import assert from 'node:assert/strict';
import {
  buildOrgAlignedObjectiveTree,
  listUpstreamVisibleGoals,
  resolveAlignmentContext,
  type OrgAlignedObjective,
} from './mboOrgAlignedTreeEngine';

const rows: OrgAlignedObjective[] = [
  {
    id: 'c1',
    parentId: null,
    level: 'company',
    title: '전사',
    ownerId: 'ceo',
    ownerName: '김대표',
    progressRate: 20,
    weight: 100,
    status: 'in_progress',
  },
  {
    id: 'd1',
    parentId: 'c1',
    level: 'department',
    title: '팀목표',
    ownerId: 'lead',
    ownerName: '이리더',
    departmentId: 'team1',
    departmentName: '연구개발1팀',
    progressRate: 30,
    weight: 50,
    status: 'in_progress',
  },
  {
    id: 'i1',
    parentId: 'd1',
    level: 'individual',
    title: '개인',
    ownerId: 'staff',
    ownerName: '최연구',
    departmentId: 'team1',
    progressRate: 40,
    weight: 40,
    status: 'in_progress',
  },
];

const flat = buildOrgAlignedObjectiveTree(rows);
assert.deepEqual(
  flat.map((r) => ({ id: r.id, depth: r.depth })),
  [
    { id: 'c1', depth: 0 },
    { id: 'd1', depth: 1 },
    { id: 'i1', depth: 2 },
  ]
);

const ctx = resolveAlignmentContext({
  visibleObjectives: rows,
  viewerUserId: 'staff',
  viewerDepartmentId: 'team1',
});
assert.equal(ctx.company?.id, 'c1');
assert.equal(ctx.department?.id, 'd1');
assert.equal(ctx.mine?.id, 'i1');

// 리더: 개인 KPI 없으면 본인 소유 department 목표로 폴백
const leadCtx = resolveAlignmentContext({
  visibleObjectives: rows,
  viewerUserId: 'lead',
  viewerDepartmentId: 'team1',
});
assert.equal(leadCtx.mine?.id, 'd1');
assert.equal(leadCtx.mine?.level, 'department');

const upstream = listUpstreamVisibleGoals({
  visibleObjectives: rows,
  managedUserIds: ['staff'],
  viewerUserId: 'lead',
});
assert.ok(upstream.some((u) => u.id === 'c1'));
assert.ok(!upstream.some((u) => u.id === 'd1')); // lead owns d1 → not upstream

console.log('mboOrgAlignedTreeEngine.test.ts: ok');
