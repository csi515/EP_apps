/**
 * 실행: npx tsx src/capabilities/mbo/domain/mboFrappeGanttTasks.test.ts
 */
import assert from 'node:assert/strict';
import {
  buildMboFrappeGanttTasks,
  formatGanttDateYmd,
  isMboGanttProjectTaskId,
  mboGanttProjectIdFromTask,
} from './mboFrappeGanttTasks';

const tasks = buildMboFrappeGanttTasks([
  {
    kind: 'objective',
    id: 'o1',
    title: '팀목표',
    ownerName: '리더',
    ownerId: 'u1',
    status: 'in_progress',
    startDate: '2026-01-01',
    targetDate: '2026-12-31',
    progressRate: 35,
    weight: 50,
    lockStatus: 'LOCKED',
    isStrictLocked: false,
  },
  {
    kind: 'project',
    id: 'p1',
    objectiveId: 'o1',
    title: '실행과제',
    ownerName: '직원',
    ownerId: 'u2',
    status: 'in_progress',
    startDate: '2026-03-01',
    targetDate: '2026-06-30',
    progressRate: 40,
  },
]);

assert.equal(tasks.length, 1);
assert.equal(tasks[0].id, 'proj:p1');
assert.equal(tasks[0].name, '실행과제');
assert.equal(tasks[0].dependencies, undefined);
assert.ok(!tasks.some((t) => t.id.startsWith('obj:')));
assert.ok(!tasks.some((t) => t.id.startsWith('__mbo_gantt_range_')));
assert.ok(isMboGanttProjectTaskId(tasks[0].id));
assert.equal(mboGanttProjectIdFromTask(tasks[0].id), 'p1');
assert.equal(formatGanttDateYmd(new Date(2026, 0, 5)), '2026-01-05');

const withRange = buildMboFrappeGanttTasks(
  [
    {
      kind: 'project',
      id: 'p1',
      objectiveId: 'o1',
      title: '실행과제',
      ownerName: '직원',
      ownerId: 'u2',
      status: 'in_progress',
      startDate: '2026-03-01',
      targetDate: '2026-06-30',
      progressRate: 40,
    },
  ],
  { startDate: '2026-03-01', endDate: '2026-03-31' },
);
assert.equal(withRange.length, 1);
assert.equal(withRange[0]?.id, 'proj:p1');
assert.equal(withRange[0]?.start, '2026-03-01');
assert.equal(withRange[0]?.end, '2026-03-31');
assert.equal(withRange[0]?.progress, 40);
assert.ok(!withRange.some((t) => t.id.startsWith('__mbo_gantt_range_')));

const clippedOut = buildMboFrappeGanttTasks(
  [
    {
      kind: 'project',
      id: 'p2',
      objectiveId: null,
      title: '구간밖',
      ownerName: '직원',
      ownerId: 'u2',
      status: 'in_progress',
      startDate: '2026-01-01',
      targetDate: '2026-01-31',
      progressRate: 10,
    },
  ],
  { startDate: '2026-03-01', endDate: '2026-03-31' },
);
assert.equal(clippedOut.length, 0);

console.log('mboFrappeGanttTasks.test.ts: ok');
