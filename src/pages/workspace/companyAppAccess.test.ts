/**
 * 사내 앱 런처·라우트 접근 규칙
 * 실행: npx tsx src/pages/workspace/companyAppAccess.test.ts
 */
import assert from 'node:assert/strict';
import { mapPresetPermissionTokensToRoleMap } from '@/core/organizations/services/epRoleSeed';
import {
  canAccessCompanyApp,
  companyAppAccessFeatureKey,
  COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS,
  describeAppPermissionEffectiveState,
  getMemberFeatureTriState,
} from './companyAppAccess';
import { FEATURE_OPTION_I18N, EP_APPS_MESSAGES_KO, EP_APPS_MESSAGES_EN } from '@/core/i18n/epAppsMessages';

const staffMbo = {
  role: 'staff',
  customRole: { permissions: mapPresetPermissionTokensToRoleMap(['mbo:view']) },
  feature_permissions: {},
};

assert.equal(canAccessCompanyApp('mbo', staffMbo), true, 'mbo:view grants MBO app');

assert.equal(
  canAccessCompanyApp('mbo', {
    ...staffMbo,
    feature_permissions: { [companyAppAccessFeatureKey('mbo')]: false },
  }),
  false,
  'explicit company_app:mbo false blocks despite role'
);

assert.equal(
  canAccessCompanyApp('mbo', {
    role: 'staff',
    customRole: { permissions: mapPresetPermissionTokensToRoleMap([]) },
    feature_permissions: { [companyAppAccessFeatureKey('mbo')]: true },
  }),
  true,
  'explicit company_app:mbo true without role'
);

assert.equal(
  canAccessCompanyApp('sop_risk', staffMbo),
  false,
  'SOP app needs safety assignment or owner'
);

assert.equal(
  canAccessCompanyApp('sop_risk', {
    role: 'staff',
    customRole: null,
    feature_permissions: { 'safety:manage': true },
  }),
  true,
  'safety:manage feature opens SOP app'
);

assert.equal(canAccessCompanyApp('research', { role: 'owner', customRole: null }), true);

assert.equal(
  canAccessCompanyApp('sop_risk', { role: 'manager', customRole: null, feature_permissions: {} }),
  true,
  'org admin (manager) sees all apps including SOP'
);

assert.equal(
  canAccessCompanyApp('mbo', {
    role: 'manager',
    customRole: null,
    feature_permissions: { [companyAppAccessFeatureKey('mbo')]: false },
  }),
  true,
  'org admin bypasses explicit company_app deny'
);

assert.equal(
  canAccessCompanyApp('research', {
    role: 'staff',
    customRole: { permissions: mapPresetPermissionTokensToRoleMap(['research_project:view']) },
  }),
  true
);

assert.equal(
  describeAppPermissionEffectiveState('mbo', staffMbo),
  'role',
  'mbo:view → role state'
);
assert.equal(
  describeAppPermissionEffectiveState('mbo', {
    ...staffMbo,
    feature_permissions: { [companyAppAccessFeatureKey('mbo')]: false },
  }),
  'denied'
);
assert.equal(
  describeAppPermissionEffectiveState('mbo', {
    role: 'staff',
    customRole: null,
    feature_permissions: { [companyAppAccessFeatureKey('mbo')]: true },
  }),
  'granted'
);
assert.equal(getMemberFeatureTriState('company_app:mbo', {}), 'unset');
assert.equal(getMemberFeatureTriState('company_app:mbo', { 'company_app:mbo': false }), 'denied');

for (const opt of COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS) {
  assert.ok(FEATURE_OPTION_I18N[opt.key], `FEATURE_OPTION_I18N missing ${opt.key}`);
  assert.ok(opt.labelKey.startsWith('ep.feature.'), `${opt.key} labelKey`);
  assert.ok(EP_APPS_MESSAGES_KO[opt.labelKey], `KO missing ${opt.labelKey}`);
  assert.ok(EP_APPS_MESSAGES_EN[opt.labelKey], `EN missing ${opt.labelKey}`);
  assert.ok(EP_APPS_MESSAGES_KO[opt.descKey], `KO missing ${opt.descKey}`);
  assert.ok(EP_APPS_MESSAGES_EN[opt.descKey], `EN missing ${opt.descKey}`);
}

assert.equal(Object.keys(EP_APPS_MESSAGES_KO).length, Object.keys(EP_APPS_MESSAGES_EN).length);

console.log('companyAppAccess.test.ts: ok');
