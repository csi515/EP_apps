/**
 * EP_apps 프리셋 회귀 — personal_plant_ops 단일.
 * 실행: npx tsx src/app/presets/presetEpAppsRegression.test.ts
 */
import assert from 'node:assert/strict';
import { INDUSTRY_PRESETS, getIndustryPreset, listIndustryPresets } from './presetRegistry';
import { assemblePreset } from './presetAssembler';
import {
  TAB_REQUIRED_CAPABILITIES,
  isTabAllowedForCapabilities,
} from '@/app/industry/genericIndustryTabs';

console.log('[REGRESSION TEST] EP_apps personal_plant_ops audit starting...\n');

const allPresets = listIndustryPresets();
const allPresetIds = Object.keys(INDUSTRY_PRESETS);

assert.equal(allPresetIds.length, 1, 'EP_apps 프리셋 수는 정확히 1개여야 합니다.');
assert.equal(allPresets.length, 1);
assert.equal(allPresetIds[0], 'personal_plant_ops');

const preset = getIndustryPreset('personal_plant_ops');
assert.ok(preset, 'personal_plant_ops 프리셋이 존재해야 합니다.');
assert.equal(preset.name, 'EP_apps');
assert.ok(Array.isArray(preset.capabilities) && preset.capabilities.length > 0);

const assembled = assemblePreset('personal_plant_ops');
assert.ok(assembled, 'assemblePreset(personal_plant_ops) 성공해야 합니다.');
assert.ok(assembled.capabilities.length > 0);

const caps = new Set(assembled.capabilities.map((c) => (typeof c === 'string' ? c : c)));
for (const [tab, required] of Object.entries(TAB_REQUIRED_CAPABILITIES)) {
  if (!required || required.length === 0) continue;
  const allowed = isTabAllowedForCapabilities(tab, [...caps]);
  if (required.every((r) => caps.has(r))) {
    assert.equal(allowed, true, `탭 ${tab}은 활성 capability로 허용되어야 합니다.`);
  }
}

assert.equal(getIndustryPreset('piano'), undefined);
assert.equal(getIndustryPreset('pilates'), undefined);

console.log('presetEpAppsRegression.test.ts: ok');
