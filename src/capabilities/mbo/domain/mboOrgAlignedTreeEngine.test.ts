/**
 * 실행: npx tsx src/capabilities/mbo/domain/mboOrgAlignedTreeEngine.test.ts
 */
import assert from 'node:assert/strict';
import {
  buildOrgAlignedObjectiveTree,
  listAlignmentSlotRows,
  listUpstreamVisibleGoals,
  resolveAlignmentContext,
  type OrgAlignedObjective,
} from './mboOrgAlignedTreeEngine';

const rows: OrgAlignedObjective[] = [
  {
    id: 'c1',
    parentId: null,
    level: 'company',
    title: '전사A',
    ownerId: 'ceo',
    ownerName: '김대표',
    progressRate: 20,
    weight: 40,
    status: 'in_progress',
  },
  {
    id: 'c2',
    parentId: null,
    level: 'company',
    title: '전사B',
    ownerId: 'ceo',
    ownerName: '김대표',
    progressRate: 10,
    weight: 30,
    status: 'in_progress',
  },
  {
    id: 'c3',
    parentId: null,
    level: 'company',
    title: '전사C',
    ownerId: 'ceo',
    ownerName: '김대표',
    progressRate: 15,
    weight: 30,
    status: 'in_progress',
  },
  {
    id: 'd1',
    parentId: 'c1',
    level: 'department',
    title: '팀목표1',
    ownerId: 'lead',
    ownerName: '이리더',
    departmentId: 'team1',
    departmentName: '연구개발1팀',
    progressRate: 30,
    weight: 50,
    status: 'in_progress',
  },
  {
    id: 'd2',
    parentId: 'c2',
    level: 'department',
    title: '팀목표2',
    ownerId: 'lead',
    ownerName: '이리더',
    departmentId: 'team1',
    departmentName: '연구개발1팀',
    progressRate: 25,
    weight: 50,
    status: 'in_progress',
  },
  {
    id: 'i1',
    parentId: 'd1',
    level: 'individual',
    title: '개인1',
    ownerId: 'staff',
    ownerName: '최연구',
    departmentId: 'team1',
    progressRate: 40,
    weight: 40,
    status: 'in_progress',
  },
  {
    id: 'i2',
    parentId: 'd2',
    level: 'individual',
    title: '개인2',
    ownerId: 'staff',
    ownerName: '최연구',
    departmentId: 'team1',
    progressRate: 20,
    weight: 60,
    status: 'in_progress',
  },
];

const flat = buildOrgAlignedObjectiveTree(rows);
assert.equal(flat.filter((r) => r.level === 'company').length, 3);

const ctx = resolveAlignmentContext({
  visibleObjectives: rows,
  viewerUserId: 'staff',
  viewerDepartmentId: 'team1',
});
assert.equal(ctx.companyCount, 3);
assert.equal(ctx.companies.length, 3);
assert.equal(ctx.departmentCount, 2);
assert.equal(ctx.departments.map((d) => d.id).sort().join(','), 'd1,d2');
assert.equal(ctx.mineCount, 2);
assert.equal(ctx.mines.map((m) => m.id).sort().join(','), 'i1,i2');

const companyRows = listAlignmentSlotRows(ctx, 'company');
assert.equal(companyRows.length, 3);
assert.ok(companyRows.every((r) => r.depth === 0 && r.level === 'company'));

const deptRows = listAlignmentSlotRows(ctx, 'department');
assert.equal(deptRows.length, 2);

const mineRows = listAlignmentSlotRows(ctx, 'mine');
assert.equal(mineRows.length, 2);

// 리더: 개인 KPI가 없으면 본인 소유 department 목표로 폴백
const leadCtx = resolveAlignmentContext({
  visibleObjectives: rows,
  viewerUserId: 'lead',
  viewerDepartmentId: 'team1',
});
assert.equal(leadCtx.mine?.level, 'department');
assert.equal(leadCtx.mineCount, 2);
assert.equal(leadCtx.mines.length, 2);

const upstream = listUpstreamVisibleGoals({
  visibleObjectives: rows,
  managedUserIds: ['staff'],
  viewerUserId: 'lead',
});
assert.ok(upstream.some((u) => u.id === 'c1'));
assert.ok(!upstream.some((u) => u.id === 'd1')); // lead owns d1 → not upstream

console.log('mboOrgAlignedTreeEngine.test.ts: ok');
