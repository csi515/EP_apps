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

assert.equal(tasks.length, 2);
assert.equal(tasks[0].id, 'obj:o1');
assert.equal(tasks[1].id, 'proj:p1');
assert.equal(tasks[1].dependencies, 'obj:o1');
assert.ok(isMboGanttProjectTaskId(tasks[1].id));
assert.equal(mboGanttProjectIdFromTask(tasks[1].id), 'p1');
assert.equal(formatGanttDateYmd(new Date(2026, 0, 5)), '2026-01-05');

console.log('mboFrappeGanttTasks.test.ts: ok');
