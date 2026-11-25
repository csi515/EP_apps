import assert from 'node:assert/strict';
import { buildHierarchyGanttRows } from './mboGanttHierarchyEngine';
import type { PortfolioProject } from './projectPortfolioEngine';

const objectives = [
  {
    id: 'o1',
    title: '품질 목표',
    ownerId: 'u1',
    ownerName: '홍길',
    status: 'approved' as const,
    startDate: '2026-01-01',
    targetDate: '2026-12-31',
    progressRate: 40,
    weight: 50,
  },
];

const projects: PortfolioProject[] = [
  {
    id: 'p1',
    title: '과제 A',
    ownerId: 'u1',
    ownerName: '홍길',
    status: 'in_progress',
    startDate: '2026-02-01',
    targetDate: '2026-06-30',
    progressRate: 20,
    objectiveId: 'o1',
  },
  {
    id: 'p2',
    title: '고아 과제',
    ownerId: 'u2',
    ownerName: '김이',
    status: 'draft',
    startDate: '2026-03-01',
    targetDate: '2026-04-30',
    progressRate: 0,
    objectiveId: null,
  },
];

const rows = buildHierarchyGanttRows(objectives, projects);
assert.equal(rows[0]!.kind, 'objective');
assert.equal(rows[0]!.id, 'o1');
assert.equal(rows[1]!.kind, 'project');
assert.equal(rows[1]!.id, 'p1');
assert.ok(rows.some((r) => r.kind === 'project' && r.id === 'p2'));

const filtered = buildHierarchyGanttRows(objectives, projects, {
  ownerUserIds: ['u1'],
});
assert.ok(filtered.every((r) => r.ownerId === 'u1' || r.kind === 'objective'));

console.log('mboGanttHierarchyEngine.test.ts: ok');
