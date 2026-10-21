import assert from 'node:assert/strict';
import {
  findPendingStepForRequest,
  type ApprovalRequestRow,
  type ApprovalStepRow,
} from './approvalWorkflowService';

function run() {
  const req: ApprovalRequestRow = {
    id: 'req-1',
    title: '테스트',
    status: 'pending',
    requester_name: '김',
    current_step_order: 1,
    total_steps: 2,
    entity_type: 'research_project_gate',
    entity_id: 'gate-1',
  };
  const steps: ApprovalStepRow[] = [
    {
      id: 'step-1',
      request_id: 'req-1',
      step_order: 1,
      step_type: 'review',
      approver_name: '검토자',
      status: 'pending',
    },
    {
      id: 'step-2',
      request_id: 'req-1',
      step_order: 2,
      step_type: 'approval',
      approver_name: '소장',
      status: 'waiting',
    },
  ];

  const pending = findPendingStepForRequest(req, steps);
  assert.ok(pending);
  assert.equal(pending!.id, 'step-1');

  assert.equal(
    findPendingStepForRequest({ ...req, current_step_order: 2 }, steps)?.id,
    undefined
  );

  console.log('[test:approval-workflow-service] ok');
}

run();
