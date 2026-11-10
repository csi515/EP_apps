import assert from 'node:assert/strict';
import {
  buildTeamMemberChips,
  classifyProjectHealth,
  computeManagerKpis,
} from './mboManagerDashboardEngine';

const objectives = [
  {
    id: 'o1',
    ownerId: 'u1',
    ownerName: '김팀장',
    title: '매출',
    status: 'approved' as const,
    weight: 100,
    progressRate: 80,
    startDate: '2026-01-01',
    targetDate: '2026-12-31',
  },
];

const projects = [
  {
    id: 'p1',
    title: '프로젝트 A',
    ownerId: 'u1',
    ownerName: '김팀장',
    status: 'in_progress' as const,
    startDate: '2026-01-01',
    targetDate: '2020-01-01',
    progressRate: 30,
    objectiveId: 'o1',
  },
];

assert.equal(classifyProjectHealth(projects[0]!, new Date('2026-06-01')), 'delayed');

const kpis = computeManagerKpis(objectives, projects as any, {
  viewerUserId: 'v',
  teamUserIds: ['u1', 'u2'],
  missingMonthlyProjectIds: ['p1'],
});
assert.equal(kpis.riskProjectCount, 1);
assert.equal(kpis.checkinPendingCount, 1);

const chips = buildTeamMemberChips(objectives, projects as any, [{ userId: 'u1', displayName: '김팀장' }], {
  viewerUserId: 'v',
  teamUserIds: ['u1'],
  missingMonthlyProjectIds: ['p1'],
});
assert.equal(chips[0]!.checkinOk, false);

console.log('mboManagerDashboardEngine.test.ts OK');
