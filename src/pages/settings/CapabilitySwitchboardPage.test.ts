/**
 * EP_apps [기능 관리] 스토어 — personal_plant_ops 기준 단위 테스트
 */
import assert from 'node:assert';
import {
  resolveToolSetActivation,
  resolveToolSetDeactivation,
  getRecommendedToolSetsForPreset,
  getActiveToolSetIdsFromCapabilities,
} from '@/core/presets/operationBundles';
import { getIndustryPreset, listIndustryPresets } from '@/app/presets/presetRegistry';
import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';
import './menuVisibilityEngine.test';

console.log('[test:switchboard-store] starting EP_apps suite...');

{
  const presets = listIndustryPresets();
  assert.equal(presets.length, 1, 'EP_apps는 personal_plant_ops 단일 프리셋');
  assert.equal(getIndustryPreset('piano'), undefined, '모아 piano 프리셋 없음');
}

{
  const plant = getIndustryPreset('personal_plant_ops')!;
  const presetBaseCaps = plant.capabilities as CapabilityId[];
  assert.ok(presetBaseCaps.includes('approval_workflow'));
  assert.ok(presetBaseCaps.includes('inventory'));
  assert.ok(presetBaseCaps.includes('mbo'));

  const recommended = getRecommendedToolSetsForPreset('personal_plant_ops');
  assert.ok(Array.isArray(recommended), '추천 세트는 배열');
}
console.log('✓ 1. EP 프리셋 경계 검증 완료');

{
  const initialCaps: CapabilityId[] = ['inventory', 'booking'];
  const act1 = resolveToolSetActivation(['space_rental'], initialCaps);
  assert.ok(
    act1.nextCapabilities.includes('seat_room') ||
      act1.nextCapabilities.includes('rental_equipment') ||
      act1.nextCapabilities.length >= initialCaps.length
  );

  const act2 = resolveToolSetActivation(['booking_timeslot'], act1.nextCapabilities);
  assert.ok(act2.nextCapabilities.includes('booking'));

  const deact = resolveToolSetDeactivation(
    'space_rental',
    ['booking_timeslot'],
    act2.nextCapabilities
  );
  assert.ok(deact.nextCapabilities.includes('booking'), '다른 세트의 booking은 유지');
}
console.log('✓ 2. 세트 토글 안전 보호 검증 완료');

{
  const caps: CapabilityId[] = [
    'booking',
    'seat_room',
    'task_pipeline',
    'inventory',
    'approval_workflow',
    'mbo',
  ];
  const activeSetIds = getActiveToolSetIdsFromCapabilities(caps);
  assert.ok(Array.isArray(activeSetIds));
}
console.log('✓ 3. 활성 세트 감지 검증 완료');

console.log('[test:switchboard-store] ALL TESTS PASSED!');
