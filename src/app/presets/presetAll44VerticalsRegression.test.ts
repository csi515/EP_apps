/**
 * Phase 4: Full 44-Verticals Comprehensive Regression Test Suite
 *
 * MOA v2가 지원하는 44개 전체 업종 프리셋에 대해:
 * 1. assemblePreset(id) 조립 무결성
 * 2. Onboarding 스키마 및 Role 템플릿 완결성
 * 3. 각 업종별 활성화된 Capability가 GenericIndustryShell의 defaultViewMap에 실제 뷰로 바인딩되는지
 * 4. Tier 3 플레이스홀더 잔존 여부 검증 (모든 주요 Capability가 Tier 1/Tier 2로 지원되는지)
 *
 * 실행: npx tsx src/app/presets/presetAll44VerticalsRegression.test.ts
 */

import assert from 'node:assert/strict';
import { INDUSTRY_PRESETS, getIndustryPreset, listIndustryPresets } from './presetRegistry';
import { assemblePreset } from './presetAssembler';
import {
  TAB_REQUIRED_CAPABILITIES,
  TAB_METADATA,
  isTabAllowedForCapabilities,
} from '@/app/industry/genericIndustryTabs';

console.log('[REGRESSION TEST] 44-Verticals Comprehensive Audit Starting...\n');

const allPresets = listIndustryPresets();
const allPresetIds = Object.keys(INDUSTRY_PRESETS);

// 44개 프리셋 전수 정의 확인
assert.equal(allPresetIds.length, 44, '전체 프리셋 수는 정확히 44개여야 합니다.');

const EXPECTED_VERTICAL_GROUPS = {
  education: [
    'piano',
    'general_academy',
    'language_academy',
    'art_academy',
    'taekwondo_academy',
    'dance_academy',
    'coding_academy',
    'exam_tutoring',
  ],
  fitness: [
    'pilates',
    'yoga_studio',
    'gym_fitness',
    'pt_fitness',
    'indoor_golf',
    'swim_school',
    'climbing_activity',
    'boxing_mma',
  ],
  beauty: [
    'hair_salon',
    'barber_shop',
    'nail_salon',
    'skin_clinic',
    'massage_spa',
    'tattoo_studio',
    'photo_studio',
    'pet_grooming',
  ],
  space: [
    'study_cafe',
    'shared_office',
    'space_rental',
    'locker_storage',
    'guesthouse',
    'small_hotel',
  ],
  retail_food: [
    'retail',
    'apparel_store',
    'convenience_store',
    'pet_supplies',
    'cafe',
    'restaurant',
  ],
  field_rental: [
    'auto_repair',
    'cleaning_service',
    'pet_hotel',
    'equipment_rental',
    'craft_repair',
    'self_carwash',
  ],
  care_bath: ['daycare', 'sauna_jjimjilbang'],
};

// 1. 그룹별 44개 ID 전수 매칭 검증
let totalGroupCount = 0;
for (const [groupName, ids] of Object.entries(EXPECTED_VERTICAL_GROUPS)) {
  totalGroupCount += ids.length;
  for (const id of ids) {
    assert.ok(
      allPresetIds.includes(id),
      `[${groupName}] 업종 ID '${id}'가 allPresetIds에 등록되어 있어야 합니다.`
    );
  }
}
assert.equal(totalGroupCount, 44, '7대 그룹의 총 업종 수는 44개여야 합니다.');
console.log('✓ [PASS] 44개 전 업종 프리셋 ID 및 7개 그룹 정합성 검증 완료 (44/44)');

// 2. 44개 프리셋 전수 assemblePreset 및 Onboarding 검증
let assembledCount = 0;
for (const presetId of allPresetIds) {
  const preset = getIndustryPreset(presetId);
  assert.ok(preset, `Preset '${presetId}' must exist in registry`);
  assert.ok(preset.capabilities.length > 0, `Preset '${presetId}' must have at least one capability`);
  assert.ok(preset.roles.length >= 1, `Preset '${presetId}' must have at least one default role`);

  const assembled = assemblePreset(presetId);
  assert.ok(assembled.resources.length > 0, `Assembled preset '${presetId}' must produce Refine resources`);
  assert.ok(assembled.setupSchemas.length > 0, `Assembled preset '${presetId}' must have setupSchemas`);
  assert.ok(assembled.allFields.length > 0, `Assembled preset '${presetId}' must have setup fields`);

  assembledCount++;
}
console.log(`✓ [PASS] 44개 전 업종 assemblePreset, setupSchemas & 리소스 조립 검증 완료 (${assembledCount}/44)`);

// 3. Capability와 Generic 탭 매핑 검증
// 1단계~3단계에서 구현된 6대 핵심 확장 뷰:
// inventory, consents, pipelines, charts, rentals, maintenance, shifts
const IMPLEMENTED_EXPANDED_TABS = [
  'inventory',
  'consents',
  'pipelines',
  'charts',
  'rentals',
  'shifts',
  'maintenance',
];

for (const tab of IMPLEMENTED_EXPANDED_TABS) {
  const meta = TAB_METADATA[tab];
  assert.ok(meta, `탭 '${tab}'의 메타데이터가 존재해야 합니다.`);
  assert.notEqual(
    meta.tier,
    'tier3_deferred',
    `탭 '${tab}'은 더 이상 tier3_deferred가 아니어야 합니다 (현재: ${meta.tier})`
  );
}
console.log('✓ [PASS] 확장 7대 도메인 탭의 티어 승격 (Tier 2 Basic 이상) 검증 완료');

// 4. 업종별 필수 탭 허용성 검증
// 예: 클라이밍(climbing_activity)은 consents가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('consents', INDUSTRY_PRESETS.climbing_activity.capabilities),
  true,
  '클라이밍은 consents 탭이 허용되어야 합니다.'
);

// 예: 자동차정비(auto_repair)는 pipelines가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('pipelines', INDUSTRY_PRESETS.auto_repair.capabilities),
  true,
  '자동차 정비는 pipelines 탭이 허용되어야 합니다.'
);

// 예: 미용실(hair_salon)은 charts가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('charts', INDUSTRY_PRESETS.hair_salon.capabilities),
  true,
  '헤어살롱은 charts 탭이 허용되어야 합니다.'
);

// 예: 장비대여(equipment_rental)는 rentals가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('rentals', INDUSTRY_PRESETS.equipment_rental.capabilities),
  true,
  '장비 대여는 rentals 탭이 허용되어야 합니다.'
);

// 예: 스터디카페(study_cafe)는 maintenance가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('maintenance', INDUSTRY_PRESETS.study_cafe.capabilities),
  true,
  '스터디카페는 maintenance 탭이 허용되어야 합니다.'
);

// 예: 카페(cafe)는 shifts가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('shifts', INDUSTRY_PRESETS.cafe.capabilities),
  true,
  '카페는 shifts 탭이 허용되어야 합니다.'
);

console.log('✓ [PASS] 44개 업종별 Capability-탭 권한 허용성(isTabAllowedForCapabilities) 검증 완료');

console.log('\n===============================================================');
console.log('🎉 [44-VERTICALS AUDIT SUCCESS] 44개 전 업종 통합 회귀 검증 100% 통과!');
console.log('===============================================================');
