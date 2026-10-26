import assert from 'node:assert/strict';
import type { StepHazardBlock } from './sopNumberingAndAuditEngine';
import {
  addStep,
  buildSnapshotPayload,
  canEditRiskDraft,
  countHazardsInSnapshot,
  moveStep,
  readDocumentBody,
  removeStep,
  updateStep,
  validateDraftForSubmit,
  type SopDocumentBody,
} from './sopStepDocument';

function step(id: string, title: string): StepHazardBlock {
  return {
    id,
    stepNumber: 0,
    actionTitle: title,
    hazardDesc: `${title} 위험`,
    hazardCategory: '기계적',
    initialFreq: 4,
    initialSev: 4,
    initialScore: 0,
    initialLevel: 'low',
    sopControlMeasure: '방호 확인',
    requiredPPE: ['안전모'],
    residualFreq: 1,
    residualSev: 2,
    residualScore: 0,
    residualLevel: 'low',
    assignee: '담당',
    actionDeadline: '상시',
    isImplemented: false,
  };
}

function body(steps: StepHazardBlock[]): SopDocumentBody {
  return {
    steps,
    prohibitedActions: ['보호구 미착용 금지'],
    deptCode: 'MNT',
    deptName: '정비보전팀',
    intendedReviewerId: 'reviewer',
    intendedApproverId: 'approver',
    rejectionHistory: [],
  };
}

{
  const added = addStep([step('a', '준비')]);
  assert.equal(added.length, 2);
  assert.deepEqual(
    added.map((item) => item.stepNumber),
    [1, 2]
  );
  assert.equal(added[0].initialScore, 16);
  assert.equal(added[0].initialLevel, 'critical');

  const removed = removeStep(added, added[0].id);
  assert.equal(removed.length, 1);
  assert.equal(removed[0].stepNumber, 1);

  const moved = moveStep(
    [step('a', '첫째'), step('b', '둘째'), step('c', '셋째')],
    0,
    2
  );
  assert.deepEqual(
    moved.map((item) => item.actionTitle),
    ['둘째', '셋째', '첫째']
  );
  assert.deepEqual(
    moved.map((item) => item.stepNumber),
    [1, 2, 3]
  );

  const scored = updateStep([step('a', '작업')], 'a', { initialFreq: 2, initialSev: 2 });
  assert.equal(scored[0].initialScore, 4);
  assert.equal(scored[0].initialLevel, 'low');
  console.log('sopStepDocument: reorder and score ok');
}

{
  const saved = buildSnapshotPayload(body([step('a', '체결'), step('b', '상승')]));
  const worm = {
    title: '리프트',
    payload: saved,
  };
  const restored = readDocumentBody(worm);
  assert.equal(restored.steps.length, 2);
  assert.equal(restored.steps[1].actionTitle, '상승');
  assert.equal(restored.deptCode, 'MNT');
  assert.equal(countHazardsInSnapshot(worm), 2);
  assert.equal(restored.rejectionHistory.length, 0);

  const withRejection = buildSnapshotPayload({
    ...body([step('a', '체결')]),
    rejectionHistory: [
      {
        id: 'rej-1',
        stepOrder: 2,
        stepLabel: '검토',
        reason: '보호구 항목을 구체적으로 적을 것',
        rejectedAt: '2026-10-26T01:00:00.000Z',
      },
    ],
  });
  const kept = readDocumentBody(withRejection);
  assert.equal(kept.rejectionHistory.length, 1);
  assert.equal(kept.rejectionHistory[0].reason, '보호구 항목을 구체적으로 적을 것');
  assert.equal(validateDraftForSubmit(kept).isValid, true);
  assert.equal(validateDraftForSubmit({ ...restored, steps: [] }).isValid, false);
  console.log('sopStepDocument: payload roundtrip ok');
}

{
  assert.equal(
    canEditRiskDraft({
      status: 'APPROVED',
      createdBy: 'author',
      userId: 'author',
      role: 'owner',
    }),
    false
  );
  assert.equal(
    canEditRiskDraft({
      status: 'DRAFT',
      createdBy: 'author',
      userId: 'author',
      role: 'staff',
    }),
    true
  );
  assert.equal(
    canEditRiskDraft({
      status: 'DRAFT',
      createdBy: 'author',
      userId: 'other',
      role: 'staff',
    }),
    false
  );
  console.log('sopStepDocument: author can revise a rejected draft');
}
