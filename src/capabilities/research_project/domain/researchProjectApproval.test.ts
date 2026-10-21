import assert from 'node:assert/strict';
import {
  buildGateApprovalRequestValues,
  buildDefaultGateApprovalSteps,
  canSubmitGateToApprovalWorkflow,
  gateDecisionFromApprovalStatus,
  shouldSyncGateFromApproval,
  RESEARCH_GATE_APPROVAL_ENTITY_TYPE,
} from './researchProjectApproval';
import { createResearchProject, type ResearchGate } from './researchProjectEngine';

function run() {
  const { project } = createResearchProject({
    organizationId: 'org-1',
    title: '테스트 과제',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budgetPlanned: 1_000_000,
    members: [{ memberId: 'u1', memberName: '김연구', role: 'lead' }],
    gateTitles: ['1차'],
  });
  assert.ok(project);
  const gate = project!.gates[0];

  const values = buildGateApprovalRequestValues({
    project: project!,
    gate,
    requesterName: '김연구',
    gateNote: '상신',
  });
  assert.equal(values.entity_type, RESEARCH_GATE_APPROVAL_ENTITY_TYPE);
  assert.equal(values.entity_id, gate.id);

  const steps = buildDefaultGateApprovalSteps('org-1', 'req-1');
  assert.equal(steps.length, 2);
  assert.equal(steps[0].status, 'pending');

  assert.equal(canSubmitGateToApprovalWorkflow(gate, true).allowed, true);
  assert.equal(canSubmitGateToApprovalWorkflow(gate, false).allowed, false);

  const inApproval: ResearchGate = { ...gate, status: 'in_approval', approvalRequestId: 'req-1' };
  assert.equal(shouldSyncGateFromApproval(inApproval, 'approved'), true);
  assert.equal(gateDecisionFromApprovalStatus('approved'), 'approved');

  console.log('[test:research-project-approval] ok');
}

run();
