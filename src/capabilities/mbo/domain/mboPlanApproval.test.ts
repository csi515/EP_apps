import assert from 'node:assert/strict';
import {
  buildMboPlanApprovalContent,
  canSubmitMboPlanToApprovalWorkflow,
  readMboRequirePlanApproval,
} from './mboPlanApproval';

assert.equal(readMboRequirePlanApproval(null), true);
assert.equal(readMboRequirePlanApproval({ require_plan_approval: false }), false);
assert.equal(readMboRequirePlanApproval({ mbo: { require_plan_approval: true } }), true);

assert.equal(
  canSubmitMboPlanToApprovalWorkflow({
    requirePlanApproval: true,
    hasApprovalWorkflow: true,
    objectiveStatus: 'draft',
  }).allowed,
  true
);
assert.equal(
  canSubmitMboPlanToApprovalWorkflow({
    requirePlanApproval: true,
    hasApprovalWorkflow: false,
    objectiveStatus: 'draft',
  }).allowed,
  false
);
assert.equal(
  canSubmitMboPlanToApprovalWorkflow({
    requirePlanApproval: false,
    hasApprovalWorkflow: false,
    objectiveStatus: 'draft',
  }).allowed,
  true
);

const content = buildMboPlanApprovalContent({
  title: 'Q2 목표',
  description: '설명',
  successCriteria: '지표',
  ownerName: '김팀장',
});
assert.equal(content.kind, 'mbo_plan');
assert.equal(content.title, 'Q2 목표');

console.log('mboPlanApproval.test.ts: ok');
