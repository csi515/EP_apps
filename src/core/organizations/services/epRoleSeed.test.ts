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

console.log('epRoleSeed.test.ts: ok');
