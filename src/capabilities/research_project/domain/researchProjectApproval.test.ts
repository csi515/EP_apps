import assert from 'node:assert/strict';
import {
  buildChosenGateApprovalSteps,
  buildGateApprovalRequestValues,
  canSubmitGateToApprovalWorkflow,
  gateDecisionFromApprovalStatus,
  shouldSyncGateFromApproval,
  RESEARCH_GATE_APPROVAL_ENTITY_TYPE,
} from './researchProjectApproval';
import {
  activateDraftProject,
  createResearchProject,
  markGateSubmittedForApproval,
} from './researchProjectEngine';

console.log('[test:research-project-approval] running...');

{
  const created = createResearchProject({
    organizationId: 'org-1',
    title: '결재 스모크',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budgetPlanned: 1_000_000,
    members: [{ memberId: 'u1', memberName: '김', role: 'lead' }],
    gateTitles: ['1차'],
  });
  const project = activateDraftProject(created.project!).project;
  const gate = project.gates[0]!;

  assert.equal(canSubmitGateToApprovalWorkflow(gate, false).allowed, false);
  assert.equal(canSubmitGateToApprovalWorkflow(gate, true).allowed, true);

  const values = buildGateApprovalRequestValues({
    project,
    gate,
    requesterName: '요청자',
    requesterId: 'req-1',
    gateNote: '검토 요청',
  });
  assert.equal(values.entity_type, RESEARCH_GATE_APPROVAL_ENTITY_TYPE);
  assert.equal(values.entity_id, gate.id);
  assert.ok(String(values.title).includes('1차'));

  const steps = buildChosenGateApprovalSteps(
    'org-1',
    'req-uuid',
    { userId: 'r1', name: '검토자' },
    { userId: 'a1', name: '승인자' }
  );
  assert.equal(steps.length, 2);
  assert.equal(steps[0]?.step_type, 'review');
  assert.equal(steps[1]?.step_type, 'approval');

  const marked = markGateSubmittedForApproval(project, gate.id, 'approval-1');
  assert.equal(marked.project?.gates[0]?.status, 'in_approval');
  assert.equal(
    canSubmitGateToApprovalWorkflow(marked.project!.gates[0]!, true).allowed,
    false
  );
  assert.equal(
    shouldSyncGateFromApproval(marked.project!.gates[0]!, 'approved'),
    true
  );
  assert.equal(gateDecisionFromApprovalStatus('approved'), 'approved');
  assert.equal(gateDecisionFromApprovalStatus('rejected'), 'rejected');
  assert.equal(gateDecisionFromApprovalStatus('pending'), null);
}

console.log('[test:research-project-approval] ok');
