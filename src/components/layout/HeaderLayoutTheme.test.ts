import assert from 'node:assert/strict';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

console.log('🧪 [Test Suite] Header & Layout Visual Branding Theme');

// 1. 주요 업종별 엠블럼 및 테마 색상 무결성 검증
const expectedThemes: Record<string, { emoji: string; color: string }> = {
  indoor_golf: { emoji: '⛳', color: 'emerald' },
  hair_salon: { emoji: '✂️', color: 'rose' },
  gym_fitness: { emoji: '⚡', color: 'orange' },
  study_cafe: { emoji: '📚', color: 'amber' },
  swim_school: { emoji: '🏊', color: 'sky' },
  pilates: { emoji: '🧘', color: 'teal' },
  space_rental: { emoji: '🎉', color: 'purple' },
  auto_repair: { emoji: '🔧', color: 'slate' },
  piano: { emoji: '🎹', color: 'indigo' },
};

for (const [id, expected] of Object.entries(expectedThemes)) {
  const preset = getIndustryPreset(id);
  assert.ok(preset, `Preset [${id}] must exist`);
  assert.equal(preset.theme?.badgeEmoji, expected.emoji, `Preset [${id}] emoji mismatch`);
  assert.equal(preset.theme?.accentColor, expected.color, `Preset [${id}] accentColor mismatch`);
}

console.log('✨ Header & Layout Visual Theme tests passed cleanly!');
