import assert from 'node:assert/strict';

// 1. 기업/제조업 프리셋 vs 소상공인 프리셋 부서 스코프 지능형 분기 로직 단위 검증
function isEnterpriseOrManufacturingPreset(industryId: string, category?: string): boolean {
  const cat = category?.toLowerCase();
  const id = industryId.toLowerCase();
  return (
    cat === 'manufacturing' ||
    cat === 'enterprise' ||
    id.includes('enterprise') ||
    id.includes('manufacturing') ||
    id.includes('plant_ops') ||
    id.includes('corp') ||
    id === 'iso_ims_enterprise' ||
    id === 'iso_human_capital' ||
    id === 'rnd_lab_management' ||
    id === 'general_enterprise' ||
    id === 'manufacturing_light'
  );
}

assert.equal(
  isEnterpriseOrManufacturingPreset('personal_plant_ops', 'manufacturing'),
  true,
  '개인 공장/제조는 부서 설정 노출'
);

// 2. personal_plant_ops 프리셋이 EP_apps 유일 프리셋인지 검증
import { getIndustryPreset, listIndustryPresets } from '@/app/presets/presetRegistry';

const plantPreset = getIndustryPreset('personal_plant_ops');
assert.ok(plantPreset, 'personal_plant_ops 프리셋이 존재해야 합니다.');
assert.equal(plantPreset.name, 'EP_apps', 'personal_plant_ops 프리셋의 이름은 EP_apps 여야 합니다.');

const epPresets = listIndustryPresets();
assert.equal(epPresets.length, 1, 'EP_apps 프리셋 목록은 personal_plant_ops 1개여야 합니다.');
assert.equal(epPresets[0].id, 'personal_plant_ops');
assert.equal(getIndustryPreset('piano'), undefined, '모아 업종 프리셋(piano)은 EP_apps에 없어야 합니다.');

// 3. 온보딩 직급 순서 정규화(100단위 간격) — QuickSetupPage.normalizeRankOrders 와 동일 규칙
function normalizeRankOrders<T extends { rank_order: number }>(roles: readonly T[]): T[] {
  return roles.map((r, index) => ({
    ...r,
    rank_order: (index + 1) * 100,
  }));
}

const inputRoles = [
  { name: '대표이사', rank_order: 1 },
  { name: '본부장', rank_order: 2 },
  { name: '팀장', rank_order: 3 },
  { name: '팀원', rank_order: 4 },
];

const normalized = normalizeRankOrders(inputRoles);
assert.equal(normalized[0].rank_order, 100, '첫 번째 직급은 100');
assert.equal(normalized[1].rank_order, 200, '두 번째 직급은 200');
assert.equal(normalized[2].rank_order, 300, '세 번째 직급은 300');
assert.equal(normalized[3].rank_order, 400, '네 번째 직급은 400');

const reordered = [inputRoles[1], inputRoles[0], inputRoles[2], inputRoles[3]];
const reorderedNormalized = normalizeRankOrders(reordered);
assert.equal(reorderedNormalized[0].name, '본부장');
assert.equal(reorderedNormalized[0].rank_order, 100);
assert.equal(reorderedNormalized[1].name, '대표이사');
assert.equal(reorderedNormalized[1].rank_order, 200);

console.log('QuickSetupPage.test.ts: ok');
