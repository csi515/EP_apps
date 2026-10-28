/**
 * [메뉴 표시 관리] menuVisibilityEngine — personal_plant_ops 단위 테스트
 */
import assert from 'node:assert';
import {
  getPresetMenuItems,
  isCapabilityRequired,
  toggleCapabilityVisibility,
  getEffectiveSidebarCapabilities,
} from './menuVisibilityEngine';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

console.log('[test:menu-visibility-engine] starting EP suite...');

const testPresetId = 'personal_plant_ops';
const plantPreset = getIndustryPreset(testPresetId);
assert.ok(plantPreset, `테스트 프리셋(${testPresetId})이 존재해야 합니다.`);

{
  const items = getPresetMenuItems(testPresetId, []);
  const itemIds = items.map((i) => i.id);

  assert.deepStrictEqual(itemIds, plantPreset.capabilities, '프리셋 capabilities와 일치');
  assert.ok(itemIds.includes('approval_workflow'), '결재는 EP 메뉴에 포함');
  assert.ok(itemIds.includes('inventory'), '재고는 EP 메뉴에 포함');
  assert.ok(!itemIds.includes('table_order_kds'), '식당 KDS는 EP 메뉴에 없음');
}
console.log('✓ 1. 프리셋 화이트리스트 경계 검증 완료');

{
  const requiredCaps = plantPreset.requiredCapabilities as string[];
  assert.ok(requiredCaps.length > 0, '필수 기능이 정의되어 있어야 함');

  const items = getPresetMenuItems(testPresetId, requiredCaps);
  for (const reqCap of requiredCaps) {
    const item = items.find((i) => i.id === reqCap);
    assert.ok(item, `필수 기능(${reqCap})이 목록에 존재해야 함`);
    assert.strictEqual(item?.isRequired, true);
    assert.strictEqual(item?.isVisible, true);
    assert.strictEqual(isCapabilityRequired(testPresetId, reqCap), true);
  }
}
console.log('✓ 2. 핵심 필수 기능 보호 검증 완료');

{
  const nonRequiredCaps = (plantPreset.capabilities as string[]).filter(
    (c) => !(plantPreset.requiredCapabilities as string[]).includes(c)
  );
  assert.ok(nonRequiredCaps.length > 0, '선택 가능한 기능이 존재해야 함');

  const targetCap = nonRequiredCaps[0];
  assert.strictEqual(isCapabilityRequired(testPresetId, targetCap), false);

  const hiddenAfterAdd = toggleCapabilityVisibility(testPresetId, [], targetCap);
  assert.ok(hiddenAfterAdd.includes(targetCap));

  const hiddenAfterRemove = toggleCapabilityVisibility(testPresetId, hiddenAfterAdd, targetCap);
  assert.ok(!hiddenAfterRemove.includes(targetCap));
}
console.log('✓ 3. 선택 기능 숨김 토글 검증 완료');

{
  const requiredCap = (plantPreset.requiredCapabilities as string[])[0];

  const result = toggleCapabilityVisibility(testPresetId, [], requiredCap);
  assert.ok(!result.includes(requiredCap), '필수 기능은 숨김 목록에 들어갈 수 없음');

  const sanitized = toggleCapabilityVisibility(testPresetId, [requiredCap, 'other_cap'], requiredCap);
  assert.ok(!sanitized.includes(requiredCap));
  assert.ok(sanitized.includes('other_cap'));
}
console.log('✓ 4. 필수 기능 숨김 방지 가드 검증 완료');

{
  const nonRequiredCaps = (plantPreset.capabilities as string[]).filter(
    (c) => !(plantPreset.requiredCapabilities as string[]).includes(c)
  );
  const hidden = nonRequiredCaps.slice(0, 2);
  const effective = getEffectiveSidebarCapabilities(testPresetId, hidden);
  for (const reqCap of plantPreset.requiredCapabilities as string[]) {
    assert.ok(effective.includes(reqCap), `필수 ${reqCap}은 사이드바에 유지`);
  }
  for (const h of hidden) {
    assert.ok(!effective.includes(h), `숨긴 ${h}는 사이드바에서 제외`);
  }
}
console.log('✓ 5. 유효 사이드바 Capability 집합 검증 완료');

console.log('[test:menu-visibility-engine] ALL TESTS PASSED!');
