/**
 * personal_plant_ops 프리셋 표면: 학원 capability·탭이 기본 번들에 없는지
 * 실행: npm run test:plant-ops-surface-edge
 */
import assert from 'node:assert/strict';
import { getIndustryPreset, listIndustryPresets, PRESET_ALIASES } from './presetRegistry';
import { isTabAllowedForCapabilities } from '@/app/industry/genericIndustryTabs';

console.log('[test:plant-ops-surface-edge] start');

const preset = getIndustryPreset('personal_plant_ops');
assert.ok(preset, 'personal_plant_ops preset must exist');
assert.equal(listIndustryPresets().length, 1, 'EP_apps must expose a single preset');

const caps = new Set(preset!.capabilities as readonly string[]);
const required = new Set(preset!.requiredCapabilities as readonly string[]);

const ACADEMY_CAPS = [
  'attendance',
  'passes',
  'locker',
  'instructor_match',
  'learning_journal',
  'makeup_lesson_pass',
  'daily_care_report',
  'substitute_dispatch',
  'achievement_quest_badge',
  'curriculum_progress',
  'exam_grade_analytics',
] as const;

for (const cap of ACADEMY_CAPS) {
  assert.equal(caps.has(cap), false, `preset must not include academy cap: ${cap}`);
  assert.equal(required.has(cap), false, `required must not include academy cap: ${cap}`);
}

// 핵심 현장 업무 cap은 유지
for (const cap of [
  'approval_workflow',
  'inventory',
  'booking',
  'whistleblower_grievance',
  'mbo',
  'research_project',
  'sop_risk_assessment',
] as const) {
  assert.ok(caps.has(cap), `preset must include ${cap}`);
  assert.ok(required.has(cap), `required must include ${cap}`);
}

const enabled = [...caps];
// TAB_REQUIRED_CAPABILITIES에 등록된 학원 탭은 차단
assert.equal(isTabAllowedForCapabilities('attendance', enabled), false);
assert.equal(isTabAllowedForCapabilities('passes', enabled), false);
assert.equal(isTabAllowedForCapabilities('lockers', enabled), false);
assert.equal(isTabAllowedForCapabilities('instructors', enabled), false);
// EP 핵심 탭은 허용
assert.equal(isTabAllowedForCapabilities('mbo', enabled), true);
assert.equal(isTabAllowedForCapabilities('grievances', enabled), true);
assert.equal(isTabAllowedForCapabilities('intranet-hub', enabled), true);
assert.equal(isTabAllowedForCapabilities('bookings', enabled), true);

// alias → 동일 프리셋
for (const [alias, target] of Object.entries(PRESET_ALIASES)) {
  assert.equal(target, 'personal_plant_ops', `alias ${alias}`);
  assert.equal(getIndustryPreset(alias)?.id, 'personal_plant_ops');
}

// 용어: 학원 단어 금지
const terms = preset!.terms;
assert.ok(terms);
assert.doesNotMatch(String(terms.customer ?? ''), /원생|수강생|학부모/);
assert.doesNotMatch(String(terms.instructor ?? ''), /강사|선생님/);
assert.doesNotMatch(String(terms.fee ?? ''), /수강료|원비/);

console.log('personalPlantOps.surface.edge.test.ts: ok');
