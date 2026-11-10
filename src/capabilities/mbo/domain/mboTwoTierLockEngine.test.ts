import assert from 'node:assert/strict';
import { DEFAULT_MBO_CYCLE } from './mboCycle';
import {
  canEditExecutionProject,
  canEditMboGoalFields,
  canManagerOverrideCycleGoalLock,
  computeMboLockRatioLabel,
  countPendingGoalApprovals,
  isCycleGoalsLocked,
  resolveMboGoalLockView,
} from './mboTwoTierLockEngine';

assert.equal(isCycleGoalsLocked(DEFAULT_MBO_CYCLE, new Date(2026, 0, 31)), false);
assert.equal(isCycleGoalsLocked(DEFAULT_MBO_CYCLE, new Date(2026, 1, 1)), true);
assert.equal(canEditExecutionProject(), true);
assert.equal(canEditMboGoalFields('approved', true, {}), false);
assert.equal(canEditMboGoalFields('approved', true, { canOverrideCycleLock: true }), true);
assert.equal(canEditMboGoalFields('draft', false, {}), true);
assert.equal(canManagerOverrideCycleGoalLock(true, true), true);
assert.equal(canManagerOverrideCycleGoalLock(true, false), false);

const mgrUnlock = resolveMboGoalLockView('approved', true, true);
assert.equal(mgrUnlock.isStrictLocked, false);
assert.equal(mgrUnlock.managerOverrideActive, true);

const pending = resolveMboGoalLockView('submitted', false);
assert.equal(pending.lockStatus, 'PENDING_APPROVAL');
const changeReq = resolveMboGoalLockView('submitted', true);
assert.equal(changeReq.lockStatus, 'CHANGE_REQUESTED');

assert.equal(countPendingGoalApprovals([{ status: 'submitted', ownerId: 'u1' }]), 1);

const ratio = computeMboLockRatioLabel(
  [
    { status: 'approved', ownerId: 'u1' },
    { status: 'draft', ownerId: 'u2' },
  ],
  ['u1', 'u2'],
  true,
);
assert.equal(ratio.lockedCount, 1);

console.log('mboTwoTierLockEngine.test.ts OK');
