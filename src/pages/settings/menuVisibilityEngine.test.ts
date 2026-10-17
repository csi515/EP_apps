/**
 * [메뉴 표시 관리] menuVisibilityEngine 단위 테스트
 */
import assert from 'node:assert';
import {
  getPresetMenuItems,
  isCapabilityRequired,
  toggleCapabilityVisibility,
  getEffectiveSidebarCapabilities,
} from './menuVisibilityEngine';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

console.log('[test:menu-visibility-engine] starting test suite...');

const testPresetId = 'piano';
const pianoPreset = getIndustryPreset(testPresetId);
assert.ok(pianoPreset, `테스트 프리셋(${testPresetId})이 존재해야 합니다.`);

// 1. 프리셋 화이트리스트 준수: 현재 업종에 속한 Capability만 반환하고 타 업종 기능은 배제한다
{
  const items = getPresetMenuItems(testPresetId, []);
  const itemIds = items.map((i) => i.id);

  assert.deepStrictEqual(itemIds, pianoPreset.capabilities, '프리셋의 capabilities와 완전히 일치해야 함');
  assert.ok(!itemIds.includes('table_order_kds'), '식당 KDS는 학원 메뉴에 포함되지 않아야 함');
  assert.ok(!itemIds.includes('recipe_bom'), '공장 BOM은 학원 메뉴에 포함되지 않아야 함');
  assert.ok(!itemIds.includes('hygiene_haccp_log'), 'HACCP 로그는 학원 메뉴에 포함되지 않아야 함');
}
console.log('✓ 1. 프리셋 화이트리스트 경계 엄격 준수 검증 완료');

// 2. 핵심 필수 기능 보호: requiredCapabilities 항목은 isRequired === true 이며 항상 표시된다
{
  const requiredCaps = pianoPreset.requiredCapabilities as string[];
  assert.ok(requiredCaps.length > 0, '피아노 학원은 필수 기능이 정의되어 있어야 함');

  const items = getPresetMenuItems(testPresetId, requiredCaps); // 의도적으로 hidden에 필수항목을 넣어봄
  for (const reqCap of requiredCaps) {
    const item = items.find((i) => i.id === reqCap);
    assert.ok(item, `필수 기능(${reqCap})이 목록에 존재해야 함`);
    assert.strictEqual(item?.isRequired, true, `필수 기능(${reqCap})은 isRequired === true 이어야 함`);
    assert.strictEqual(item?.isVisible, true, `필수 기능(${reqCap})은 hidden에 있더라도 isVisible === true 유지`);
    assert.strictEqual(isCapabilityRequired(testPresetId, reqCap), true);
  }
}
console.log('✓ 2. 핵심 필수 기능 보호 및 isRequired/isVisible 가드 검증 완료');

// 3. 선택 기능 숨김(Hide) 및 토글: 선택 메뉴를 체크 해제하면 hiddenCapabilities에 정상 반영된다
{
  const nonRequiredCaps = (pianoPreset.capabilities as string[]).filter(
    (c) => !(pianoPreset.requiredCapabilities as string[]).includes(c)
  );
  assert.ok(nonRequiredCaps.length > 0, '선택 가능한 기능이 존재해야 함');

  const targetCap = nonRequiredCaps[0];
  assert.strictEqual(isCapabilityRequired(testPresetId, targetCap), false);

  // 숨김 추가
  const hiddenAfterAdd = toggleCapabilityVisibility(testPresetId, [], targetCap);
  assert.ok(hiddenAfterAdd.includes(targetCap), '숨김 목록에 대상 기능이 포함되어야 함');

  // 다시 토글 시 숨김 해제 (다시 표시)
  const hiddenAfterRemove = toggleCapabilityVisibility(testPresetId, hiddenAfterAdd, targetCap);
  assert.ok(!hiddenAfterRemove.includes(targetCap), '토글 후 숨김 목록에서 제외되어야 함');
}
console.log('✓ 3. 선택 기능 숨김(Hide) 토글 검증 완료');

// 4. 필수 기능 토글 시도 가드: 필수 기능을 숨기려 해도 hidden 목록에 추가되지 않는다
{
  const requiredCap = (pianoPreset.requiredCapabilities as string[])[0];

  const result = toggleCapabilityVisibility(testPresetId, [], requiredCap);
  assert.ok(!result.includes(requiredCap), '필수 기능은 숨김 목록에 들어갈 수 없음');

  // 혹시 기존 hidden에 필수 항목이 들어있었다면 토글 시 정화(제거)됨
  const sanitized = toggleCapabilityVisibility(testPresetId, [requiredCap, 'other_cap'], requiredCap);
  assert.ok(!sanitized.includes(requiredCap), '오염된 필수 기능은 정화되어야 함');
  assert.ok(sanitized.includes('other_cap'), '다른 일반 숨김 기능은 유지되어야 함');
}
console.log('✓ 4. 필수 기능 숨김 방지 가드 검증 완료');

// 5. 유효 사이드바 네비게이션 계산: 숨김 처리된 선택 기능은 사이드바 목록에서 제외된다
{
  const nonRequiredCaps = (pianoPreset.capabilities as string[]).filter(
    (c) => !(pianoPreset.requiredCapabilities as string[]).includes(c)
  );
  const hiddenTarget = nonRequiredCaps[0];

  const effectiveCaps = getEffectiveSidebarCapabilities(testPresetId, [hiddenTarget]);

  assert.ok(!effectiveCaps.includes(hiddenTarget), '숨겨진 기능은 사이드바 목록에서 제외되어야 함');
  for (const reqCap of pianoPreset.requiredCapabilities as string[]) {
    assert.ok(effectiveCaps.includes(reqCap), `필수 기능(${reqCap})은 반드시 사이드바에 포함되어야 함`);
  }
}
console.log('✓ 5. 유효 사이드바 네비게이션 계산 검증 완료');

console.log('[test:menu-visibility-engine] All test cases PASSED successfully!');
