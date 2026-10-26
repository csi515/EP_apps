import assert from 'node:assert/strict';
import {
  appendRejectionHistory,
  buildTwoStepApprovalLine,
  parseSavedLineDefaultSteps,
  readRejectionHistory,
  serializeSavedLineDefaultSteps,
  stepSeedRows,
  validateChosenApprovers,
  validateSavedLineTitle,
} from './approvalLine';

{
  const invalid = validateChosenApprovers({
    requesterId: 'author',
    reviewerId: '',
    approverId: 'b',
  });
  assert.equal(invalid.valid, false);

  const same = validateChosenApprovers({
    requesterId: 'author',
    reviewerId: 'same',
    approverId: 'same',
  });
  assert.equal(same.valid, false);

  const ok = validateChosenApprovers({
    requesterId: 'author',
    reviewerId: 'rev',
    approverId: 'app',
  });
  assert.equal(ok.valid, true);

  const steps = buildTwoStepApprovalLine({
    reviewer: { userId: 'rev', name: '검토자' },
    approver: { userId: 'app', name: '승인자' },
  });
  assert.equal(steps.length, 2);
  assert.equal(steps[0].stepType, 'review');
  assert.equal(steps[1].stepType, 'approval');

  const seeds = stepSeedRows({ organizationId: 'org', requestId: 'req', steps });
  assert.equal(seeds[0].status, 'pending');
  assert.equal(seeds[1].status, 'waiting');
  assert.equal(seeds[0].approver_id, 'rev');

  const withHistory = appendRejectionHistory(
    { amount: 1 },
    { stepOrder: 1, stepLabel: '검토', reason: '보완 필요', rejectedAt: '2026-01-01T00:00:00.000Z' }
  );
  assert.equal(readRejectionHistory(withHistory).length, 1);
  assert.equal(readRejectionHistory(withHistory)[0].reason, '보완 필요');

  assert.equal(validateSavedLineTitle('').valid, false);
  assert.equal(validateSavedLineTitle('구매 기본선').valid, true);

  const serialized = serializeSavedLineDefaultSteps({
    reviewer: { userId: 'rev', name: '김검토' },
    approver: { userId: 'app', name: '이승인' },
  });
  const parsed = parseSavedLineDefaultSteps(serialized);
  assert.ok(parsed);
  assert.equal(parsed!.reviewer.userId, 'rev');
  assert.equal(parsed!.approver.name, '이승인');
  assert.equal(parseSavedLineDefaultSteps([]), null);
}

console.log('[test:approval-line] ok');
