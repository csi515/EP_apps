/**
 * 실행: npx tsx src/app/industry/resolveModuleIndustry.test.ts
 */
import assert from 'node:assert/strict';
import {
  isCorporateChromePreset,
  resolveModuleIndustryId,
  shouldUseModuleChrome,
} from './resolveModuleIndustry';

assert.equal(resolveModuleIndustryId('piano'), null);
assert.equal(resolveModuleIndustryId('retail'), null);
assert.equal(resolveModuleIndustryId('personal_plant_ops'), null);
assert.equal(resolveModuleIndustryId('ep_apps'), null);

assert.equal(isCorporateChromePreset('personal_plant_ops'), true);
assert.equal(isCorporateChromePreset('ep_apps'), true);
assert.equal(isCorporateChromePreset('EP_apps'), true);
assert.equal(isCorporateChromePreset('general_enterprise'), false);
assert.equal(isCorporateChromePreset('piano'), false);

assert.equal(shouldUseModuleChrome('piano', '/workspace'), false);
assert.equal(shouldUseModuleChrome('personal_plant_ops', '/workspace'), true);
assert.equal(shouldUseModuleChrome('personal_plant_ops', '/workspace/approvals'), true);
assert.equal(shouldUseModuleChrome('personal_plant_ops', '/rnd'), true);
assert.equal(shouldUseModuleChrome('personal_plant_ops', '/billing'), false);

console.log('resolveModuleIndustry.test.ts: ok');
