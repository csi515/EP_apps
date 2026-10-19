import assert from 'node:assert/strict';
import {
  approveMboEvaluation,
  assertStaffCannotTouchFinal,
  canEmployeeMutate,
  commitMboBundle,
  excludeSample,
  submitMboEvaluation,
} from './mboStateMachine';

assert.equal(canEmployeeMutate('DRAFT'), true);
assert.equal(canEmployeeMutate('SUBMITTED'), false);
assert.equal(submitMboEvaluation('DRAFT', 'author'), 'SUBMITTED');

assert.throws(() => submitMboEvaluation('APPROVED', 'author'));
assert.throws(() => submitMboEvaluation('DRAFT', 'owner'));

const approved = approveMboEvaluation('SUBMITTED', 'evaluator', { score: 88 }, '기준 충족');
assert.equal(approved.status, 'APPROVED');
assert.equal(approved.score, 88);
assert.throws(() => approveMboEvaluation('SUBMITTED', 'author', { score: 10 }, '불가'));
assert.throws(() => approveMboEvaluation('LOCKED', 'owner', { score: 10 }, '불가'));

assert.throws(() => assertStaffCannotTouchFinal('APPROVED', 'author'));
assert.doesNotThrow(() => assertStaffCannotTouchFinal('APPROVED', 'owner'));

const saved = commitMboBundle({
  title: ' 분기 매출 ',
  keyResults: [{ name: ' 재방문 ', target: 20 }],
  comment: ' 코멘트 ',
});
assert.equal(saved.title, '분기 매출');
assert.throws(() =>
  commitMboBundle({ title: '불완전', keyResults: [], comment: '' })
);

const official = excludeSample([
  { id: 'a', isSample: false },
  { id: 'b', isSample: true },
]);
assert.deepEqual(official.map((row) => row.id), ['a']);

console.log('mboStateMachine.test.ts: ok');
