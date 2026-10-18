import assert from 'node:assert/strict';
import { listIndustryPresets } from './presetRegistry';
import { generatePresetFeatureGuide } from './presetManualEngine';
import { getIndustryFeatureGuide } from '@/core/help/featureGuides';

console.log('--- Testing presetManualEngine (Declarative 44 Verticals Manual) ---');

// 1. 단일 프리셋 검증 (study_cafe)
const scGuide = generatePresetFeatureGuide('study_cafe');
assert.ok(scGuide, 'Study cafe guide should be generated');
assert.match(scGuide.intro.title, /스터디카페/);
assert.ok(scGuide.sections.length >= 3, 'Study cafe should have at least 3 sections (customer, facility, settings)');
const facilitySection = scGuide.sections.find((s) => s.id === 'facility');
assert.ok(facilitySection, 'Facility section must exist for study cafe');
const seatItem = facilitySection.items.find((i) => i.id === 'seat_room');
assert.ok(seatItem, 'Seat room item must exist in facility section');
assert.ok(seatItem.summary.length > 5);
assert.ok(seatItem.howTo && seatItem.howTo.length > 5);
console.log('✓ [PASS] Study cafe guide structure verified');

// 2. 단일 프리셋 검증 (retail)
const retailGuide = generatePresetFeatureGuide('retail');
assert.ok(retailGuide, 'Retail guide should be generated');
assert.match(retailGuide.intro.title, /소매점/);
const commerceSection = retailGuide.sections.find((s) => s.id === 'commerce');
assert.ok(commerceSection, 'Commerce section must exist for retail');
const invItem = commerceSection.items.find((i) => i.id === 'inventory');
assert.ok(invItem, 'Inventory item must exist in commerce section');
console.log('✓ [PASS] Retail guide structure verified');

// 3. 44개 업종 프리셋 전수 생성 검증
const allPresets = listIndustryPresets();
assert.ok(allPresets.length >= 44, `Must have at least 44 presets (found ${allPresets.length})`);

let verifiedCount = 0;
for (const preset of allPresets) {
  const guide = getIndustryFeatureGuide(preset.id);
  assert.ok(guide, `Guide must be returned for preset ${preset.id}`);
  assert.ok(guide.intro.title.length > 0, `Title must not be empty for ${preset.id}`);
  assert.ok(guide.intro.body.length > 0, `Body must not be empty for ${preset.id}`);
  assert.ok(guide.sections.length >= 2, `Must have >= 2 sections for ${preset.id}`);

  // 각 섹션 아이템의 무결성 검증
  for (const section of guide.sections) {
    assert.ok(section.title.length > 0);
    assert.ok(section.items.length > 0);
    for (const item of section.items) {
      assert.ok(item.title.length > 0);
      assert.ok(item.summary.length > 0);
    }
  }
  verifiedCount++;
}

console.log(`✓ [PASS] 44개 전 업종 선언적 기능 안내서 자동 생성 검증 완료 (${verifiedCount}/${allPresets.length})`);

console.log('presetManualEngine tests passed successfully!');
