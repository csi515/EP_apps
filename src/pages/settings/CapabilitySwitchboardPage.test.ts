/**
 * [매장 기능 관리] 스토어 페이지 비즈니스 로직 및 연동 단위 테스트
 *
 * 검증 대상:
 *  1. 9대 맞춤 세트 토글 시 활성화/비활성화 목록 계산 일치
 *  2. 업종별 추천 세트 판별과 필터링
 *  3. 프리셋 기본 기능과 추가 활성 기능의 분리 저장 규칙
 */

import assert from 'node:assert';
import {
  OPERATION_TOOL_SETS,
  resolveToolSetActivation,
  resolveToolSetDeactivation,
  getRecommendedToolSetsForPreset,
  getActiveToolSetIdsFromCapabilities,
} from '@/core/presets/operationBundles';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';

console.log('[test:switchboard-store] starting test suite...');

// 1. 피아노 학원 프리셋 기준 맞춤 세트 활성화 시나리오
{
  const pianoPreset = getIndustryPreset('piano')!;
  const presetBaseCaps = pianoPreset.capabilities as CapabilityId[];

  // 피아노 학원 추천 세트 목록 확인
  const recommended = getRecommendedToolSetsForPreset('piano');
  assert.ok(recommended.includes('attendance_safety'), '피아노 학원은 안심 등하원 세트 추천');
  assert.ok(recommended.includes('billing_passes'), '피아노 학원은 수강료 세트 추천');
  assert.ok(recommended.includes('staff_operations'), '피아노 학원은 직원 관리 세트 추천');

  // 사장님이 [직원 관리 및 매장 내규 도구](staff_operations)를 켰을 때
  const activation = resolveToolSetActivation(['staff_operations'], presetBaseCaps);
  // DB에 저장할 'nextAdditional'은 프리셋 기본 기능을 제외한 목록이어야 함
  const nextAdditional = activation.nextCapabilities.filter((id) => !presetBaseCaps.includes(id));

  assert.ok(nextAdditional.includes('workplace_policy'), '사규 관리가 추가 목록에 포함되어야 함');
  assert.ok(nextAdditional.includes('shift_schedule'), '근무표가 추가 목록에 포함되어야 함');
  assert.ok(nextAdditional.includes('instructor_match'), '강사 매칭이 추가 목록에 포함되어야 함');
  assert.ok(nextAdditional.includes('task_pipeline'), '작업 파이프라인이 추가 목록에 포함되어야 함');
}
console.log('✓ 1. 프리셋 기본 기능 제외 순수 추가 목록 분리 검증 완료');

// 2. 복합 매장(피아노 + 장비대여 + 공간대여) 세트 토글 시 안전 보호 검증
{
  const initialCaps: CapabilityId[] = ['attendance', 'roster', 'billing'];

  // 1) space_rental 세트 활성화 (locker, seat_room, seat_timer_billing, rental_equipment)
  const act1 = resolveToolSetActivation(['space_rental'], initialCaps);
  assert.ok(act1.nextCapabilities.includes('seat_room'));
  assert.ok(act1.nextCapabilities.includes('locker'));

  // 2) booking_timeslot 세트도 추가 활성화 (booking, passes, seat_room, waitlist_turn_queue)
  const act2 = resolveToolSetActivation(['booking_timeslot'], act1.nextCapabilities);
  assert.ok(act2.nextCapabilities.includes('booking'));
  assert.ok(act2.nextCapabilities.includes('seat_room'));

  // 3) space_rental 세트를 끌 때, booking_timeslot이 요구하는 seat_room은 보호되어야 함
  const deact = resolveToolSetDeactivation(
    'space_rental',
    ['booking_timeslot'],
    act2.nextCapabilities
  );

  assert.ok(deact.nextCapabilities.includes('seat_room'), '공유 도구인 seat_room은 반드시 유지되어야 함');
  assert.ok(deact.nextCapabilities.includes('booking'), '다른 세트의 booking은 유지되어야 함');
  assert.strictEqual(deact.nextCapabilities.includes('locker'), false, '단독 도구인 locker는 꺼져야 함');
  assert.strictEqual(deact.nextCapabilities.includes('seat_timer_billing'), false, '단독 도구인 seat_timer_billing은 꺼져야 함');
}
console.log('✓ 2. 복합 매장 다중 세트 안전 보호 검증 완료');

// 3. 완전히 활성화된 세트 감지 일치 검증
{
  const caps: CapabilityId[] = [
    'attendance',
    'vehicle_shuttle',
    'parent',
    'roster',
    'workplace_policy',
    'shift_schedule',
    'instructor_match',
    'task_pipeline',
    'feedbacks',
    'substitute_dispatch',
  ];
  const activeSetIds = getActiveToolSetIdsFromCapabilities(caps);
  assert.ok(activeSetIds.includes('attendance_safety'), 'attendance_safety 감지');
  assert.ok(activeSetIds.includes('staff_operations'), 'staff_operations 감지');
  assert.strictEqual(activeSetIds.includes('booking_timeslot'), false, 'booking_timeslot은 미포함');
}
console.log('✓ 3. 완전히 활성화된 세트 감지 일치 검증 완료');

console.log('[test:switchboard-store] ALL TESTS PASSED! (100%)');
