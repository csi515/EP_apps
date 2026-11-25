import assert from 'node:assert/strict';
import {
  canAcknowledgeCourse,
  formatAckedAt,
  isAckCurrent,
  isMemberAssignedToCourse,
  needsReAck,
  validateAssignees,
  validateTrainingCourseDraft,
} from './trainingAckEngine';

assert.equal(
  isMemberAssignedToCourse([{ memberId: 'm1' }], 'm1', []),
  true,
);
assert.equal(
  isMemberAssignedToCourse([{ departmentId: 'd1' }], 'm1', ['d1', 'd2']),
  true,
);
assert.equal(
  isMemberAssignedToCourse([{ departmentId: 'd9' }], 'm1', ['d1']),
  false,
);

assert.equal(isAckCurrent({ courseRevision: 2 }, 2), true);
assert.equal(isAckCurrent({ courseRevision: 1 }, 2), false);
assert.equal(needsReAck({ courseRevision: 1 }, 2), true);
assert.equal(needsReAck({ courseRevision: 2 }, 2), false);
assert.equal(needsReAck(null, 1), false);

assert.equal(
  canAcknowledgeCourse({
    status: 'published',
    assigned: true,
    ack: null,
    courseRevision: 1,
  }).ok,
  true,
);
assert.equal(
  canAcknowledgeCourse({
    status: 'published',
    assigned: true,
    ack: { courseRevision: 1 },
    courseRevision: 2,
  }).ok,
  true,
);
assert.equal(
  canAcknowledgeCourse({
    status: 'published',
    assigned: true,
    ack: { courseRevision: 2 },
    courseRevision: 2,
  }).ok,
  false,
);
assert.equal(
  canAcknowledgeCourse({
    status: 'draft',
    assigned: true,
    ack: null,
    courseRevision: 1,
  }).ok,
  false,
);

assert.equal(validateTrainingCourseDraft({ title: '', body: 'x' }).ok, false);
assert.equal(validateTrainingCourseDraft({ title: '안전교육', body: '내용' }).ok, true);

assert.equal(validateAssignees([]).ok, false);
assert.equal(validateAssignees([{ memberId: 'm1' }]).ok, true);
assert.equal(validateAssignees([{ departmentId: 'd1', memberId: 'm1' }]).ok, false);

const formatted = formatAckedAt('2026-03-15T10:30:45.000Z');
assert.equal(typeof formatted, 'string');
assert.ok(formatted.length > 8);

console.log('trainingAckEngine.test.ts: ok');
