/**
 * 로그인 후 홈 런처 기능 타일 게이트 (capability · 위임 권한)
 * 실행: npm run test:company-app-features-edge
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import {
  canAccessRndPortal,
  canManageResourceCatalog,
  canManageShuttleRoutes,
} from '@/domain/permissions';
import { mapPresetPermissionTokensToRoleMap } from '@/core/organizations/services/epRoleSeed';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

console.log('[test:company-app-features-edge] start');

const preset = getIndustryPreset('personal_plant_ops');
assert.ok(preset);
const caps = new Set(preset!.capabilities as string[]);

for (const id of [
  'approval_workflow',
  'mbo',
  'research_project',
  'booking',
  'inventory',
  'whistleblower_grievance',
  'shuttle_dispatch',
  'sop_risk_assessment',
] as const) {
  assert.ok(caps.has(id), `missing capability ${id}`);
}

const launcher = readFileSync(
  join(root, 'src/pages/workspace/CompanyAppLauncherDashboard.tsx'),
  'utf8'
);
assert.match(launcher, /requiredAnyCapability/);
assert.match(launcher, /approval_workflow|mbo|research_project|shuttle/);
assert.doesNotMatch(launcher, /출결 패드|수강료|학부모/);

const teamPerms = mapPresetPermissionTokensToRoleMap([
  'booking:book',
  'whistleblower_grievance:create',
  'mbo:view',
  'research_project:view',
]);
const team = { role: 'staff', customRole: { permissions: teamPerms } };
assert.equal(canAccessRndPortal(team), true);
assert.equal(canManageResourceCatalog(team), false);
assert.equal(canManageShuttleRoutes(team), false);

const hqPerms = mapPresetPermissionTokensToRoleMap([
  'approval_workflow:*',
  'mbo:*',
  'task_pipeline:*',
  'research_project:*',
  'resources:*',
]);
const hq = { role: 'staff', customRole: { permissions: hqPerms } };
assert.equal(canManageResourceCatalog(hq), true);
assert.equal(canAccessRndPortal(hq), true);

const owner = { role: 'owner', customRole: null };
assert.equal(canManageResourceCatalog(owner), true);
assert.equal(canManageShuttleRoutes(owner), true);
assert.equal(canAccessRndPortal(owner), true);

const rolesUi = readFileSync(
  join(root, 'src/pages/settings/DynamicRoleSettingsPage.tsx'),
  'utf8'
);
assert.match(rolesUi, /RolePermissionMatrix/);
assert.match(rolesUi, /roles:assign|ownership:transfer|위임/);

const memberList = readFileSync(join(root, 'src/pages/members/MemberList.tsx'), 'utf8');
assert.match(memberList, /assign_role|위임|직급/);

console.log('companyAppFeatures.edge.test.ts: ok');
