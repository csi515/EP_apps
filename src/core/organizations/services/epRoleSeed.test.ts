import assert from 'node:assert/strict';
import { mapPresetPermissionTokensToRoleMap } from './epRoleSeed';

const allStar = mapPresetPermissionTokensToRoleMap(['*']);
assert.equal(allStar['rnd_portal:access'], true);
assert.equal(allStar['roles:assign'], true);
assert.equal(allStar.resources_manage, true);

const hq = mapPresetPermissionTokensToRoleMap([
  'approval_workflow:*',
  'mbo:*',
  'task_pipeline:*',
  'research_project:*',
  'resources:*',
]);
assert.equal(hq['rnd_portal:access'], true);
assert.equal(hq['resources:manage'], true);
assert.equal(hq.booking, true);
assert.equal(hq['roles:assign'], true);
assert.equal(hq.billing_invoices, false);

const member = mapPresetPermissionTokensToRoleMap([
  'booking:book',
  'whistleblower_grievance:create',
  'mbo:view',
  'research_project:view',
]);
assert.equal(member.booking, true);
assert.equal(member['rnd_portal:access'], true);
assert.equal(member.grievances_manage, true);
assert.equal(member['ownership:transfer'], false);
assert.equal(member['roles:assign'], false, 'mbo:view alone must not grant role delegation');
assert.equal(member['members:manage'], false);
assert.equal(member.resources_manage, false, 'booking:book alone must not grant resource catalog admin');
assert.equal(member['resources:manage'], false);

const leader = mapPresetPermissionTokensToRoleMap([
  'approval_workflow:submit',
  'approval_workflow:view',
  'mbo:update',
  'task_pipeline:*',
]);
assert.equal(leader['roles:assign'], true, 'mbo:update / task_pipeline:* grants delegation');
assert.equal(leader['members:manage'], true);
assert.equal(leader.resources_manage, false, 'leader without resources:* keeps catalog admin off');

console.log('epRoleSeed.test.ts: ok');
