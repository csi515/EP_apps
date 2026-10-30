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
assert.match(launcher, /mbo|research_project|shuttle/);
assert.doesNotMatch(launcher, /출결 패드|수강료|학부모/);
assert.doesNotMatch(
  launcher,
  /id:\s*'approvals'|label:\s*'전자 결재'|유해물질 MSDS|hazardous_substance_msds/,
  'standalone approval / MSDS launcher tiles must be removed'
);

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
assert.equal(teamPerms['mbo:goals:read'], true);
assert.equal(teamPerms['mbo:evaluations:read_all'], false, 'mbo:view alone keeps evaluations closed');

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
assert.equal(hqPerms['mbo:evaluations:read_all'], true);

const owner = { role: 'owner', customRole: null };
assert.equal(canManageResourceCatalog(owner), true);
assert.equal(canManageShuttleRoutes(owner), true);
assert.equal(canAccessRndPortal(owner), true);

const rolesUi = readFileSync(
  join(root, 'src/pages/settings/DynamicRoleSettingsPage.tsx'),
  'utf8'
);
assert.match(rolesUi, /RolePermissionMatrix/);
assert.match(rolesUi, /roles:assign|위임/);
assert.doesNotMatch(rolesUi, /OwnershipTransferCard|소유권 이전/);

const memberList = readFileSync(join(root, 'src/pages/members/MemberList.tsx'), 'utf8');
assert.match(memberList, /COMPANY_APP_FEATURE_ASSIGNMENT_OPTIONS|company_app:/);
assert.match(memberList, /assign_role|위임|직급|MemberRoleAssignModal|MemberFeaturePermissionModal/);
assert.match(memberList, /ep\.members\.|countGrantedCompanyAppUsage/);

const accessDenied = readFileSync(
  join(root, 'src/pages/workspace/CompanyAppAccessDeniedPage.tsx'),
  'utf8'
);
assert.match(accessDenied, /ep\.access\.denied/);
assert.doesNotMatch(
  readFileSync(join(root, 'src/pages/workspace/CompanyAppAccessGate.tsx'), 'utf8'),
  /Navigate|redirectTo/
);

console.log('companyAppFeatures.edge.test.ts: ok');
