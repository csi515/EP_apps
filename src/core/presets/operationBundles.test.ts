/**
 * [우리 매장 맞춤 세트] 카탈로그 및 연쇄 의존성 해결 엔진 단위 테스트
 *
 * 검증 대상:
 *  1. 9대 세트 카탈로그 무결성
 *  2. 단일 세트 활성화 시 DAG 선행 의존성 연쇄 수집 (Transitive Closure)
 *  3. 복수 세트 선택 시 중복 없는 병합
 *  4. 세트 비활성화 시 다른 활성 세트가 공유하는 도구의 안전 보존 (Safe Deactivation)
 *  5. 업종별 추천 세트 및 역방향 판별
 */

import assert from 'node:assert';
import {
  OPERATION_TOOL_SETS,
  OPERATION_TOOL_SET_MAP,
  resolveToolSetActivation,
  resolveToolSetDeactivation,
  getRecommendedToolSetsForPreset,
  getToolSetsForCapability,
  getActiveToolSetIdsFromCapabilities,
  type OperationToolSetId,
} from './operationBundles';
import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';

console.log('[test:operation-bundles] starting test suite...');

// 1. 카탈로그 기본 무결성 검증
assert.strictEqual(OPERATION_TOOL_SETS.length, 9, '9대 맞춤 세트가 정의되어야 합니다.');

for (const set of OPERATION_TOOL_SETS) {
  assert.ok(set.id, `Set ID is required: ${set.id}`);
  assert.ok(set.displayName.startsWith('[') && set.displayName.endsWith(']'), `DisplayName must be bracketed: ${set.displayName}`);
  assert.ok(set.shortName.length > 0, `ShortName is required: ${set.shortName}`);
  assert.ok(set.description.length > 10, `Description must be informative: ${set.description}`);
  assert.ok(set.iconName.length > 0, `IconName is required: ${set.iconName}`);
  assert.ok(set.capabilities.length > 0, `Capabilities must not be empty for ${set.id}`);
  assert.ok(OPERATION_TOOL_SET_MAP.has(set.id), `Map must contain ${set.id}`);
}
console.log('✓ 1. 카탈로그 기본 무결성 검증 완료');

// 2. 단일 세트 활성화 및 DAG 선행 의존성 연쇄 수집 검증
{
  // attendance_safety 활성화: attendance, vehicle_shuttle, parent 포함
  // attendance와 vehicle_shuttle은 DAG 상 'roster'를 필수 의존함
  const result = resolveToolSetActivation(['attendance_safety'], []);
  assert.ok(result.nextCapabilities.includes('attendance'), 'attendance가 포함되어야 합니다.');
  assert.ok(result.nextCapabilities.includes('vehicle_shuttle'), 'vehicle_shuttle이 포함되어야 합니다.');
  assert.ok(result.nextCapabilities.includes('parent'), 'parent가 포함되어야 합니다.');
  assert.ok(result.nextCapabilities.includes('roster'), 'DAG 선행 의존성인 roster가 자동 포함되어야 합니다.');
  assert.ok(result.autoEnabledCaps.includes('roster'), 'roster가 autoEnabled 목록에 있어야 합니다.');
}
console.log('✓ 2. 단일 세트 활성화 및 DAG 선행 의존성 연쇄 수집 검증 완료');

// 3. 직원 관리 세트의 사규 & 근무표 선행 의존성 검증
{
  // staff_operations: workplace_policy, shift_schedule, instructor_match, task_pipeline
  // workplace_policy는 shift_schedule을 의존하고, instructor_match도 shift_schedule을 의존함
  const result = resolveToolSetActivation(['staff_operations'], []);
  assert.ok(result.nextCapabilities.includes('workplace_policy'), 'workplace_policy가 포함되어야 합니다.');
  assert.ok(result.nextCapabilities.includes('shift_schedule'), 'shift_schedule이 포함되어야 합니다.');
  assert.ok(result.nextCapabilities.includes('instructor_match'), 'instructor_match가 포함되어야 합니다.');
  assert.ok(result.nextCapabilities.includes('task_pipeline'), 'task_pipeline이 포함되어야 합니다.');
}
console.log('✓ 3. 직원 관리 세트의 사규 & 근무표 의존성 검증 완료');

// 4. 복수 세트 선택 시 중복 없는 병합 검증
{
  // booking_timeslot (seat_room 포함) + space_rental (seat_room 포함)
  const result = resolveToolSetActivation(['booking_timeslot', 'space_rental'], []);
  const seatRoomOccurrences = result.nextCapabilities.filter((c) => c === 'seat_room');
  assert.strictEqual(seatRoomOccurrences.length, 1, 'seat_room은 중복 없이 1개만 존재해야 합니다.');
  assert.ok(result.nextCapabilities.includes('booking'));
  assert.ok(result.nextCapabilities.includes('passes'), 'booking의 선행 의존성 passes 포함');
  assert.ok(result.nextCapabilities.includes('locker'));
  assert.ok(result.nextCapabilities.includes('rental_equipment'));
}
console.log('✓ 4. 복수 세트 선택 시 중복 없는 병합 검증 완료');

// 5. 세트 비활성화 시 다른 활성 세트가 공유하는 도구의 안전 보존 (Safe Deactivation)
{
  // 현재 booking_timeslot과 space_rental 둘 다 활성화된 상태
  const activeCaps = resolveToolSetActivation(['booking_timeslot', 'space_rental'], []).nextCapabilities;

  // booking_timeslot을 비활성화하고 space_rental만 남기는 시나리오
  const deactResult = resolveToolSetDeactivation(
    'booking_timeslot',
    ['space_rental'],
    activeCaps
  );

  // space_rental이 여전히 요구하는 seat_room은 절대 꺼지면 안 됨!
  assert.ok(
    deactResult.nextCapabilities.includes('seat_room'),
    '공유 도구인 seat_room은 space_rental이 켜져 있으므로 안전하게 보존되어야 합니다.'
  );
  assert.strictEqual(
    deactResult.autoDisabledCaps.includes('seat_room'),
    false,
    'seat_room은 autoDisabled에 포함되어서는 안 됩니다.'
  );

  // 반면 오직 booking_timeslot에서만 썼던 booking, waitlist_turn_queue는 꺼져야 함
  assert.strictEqual(
    deactResult.nextCapabilities.includes('booking'),
    false,
    '더 이상 필요 없는 booking은 꺼져야 합니다.'
  );
  assert.ok(
    deactResult.autoDisabledCaps.includes('booking'),
    'booking은 autoDisabled에 포함되어야 합니다.'
  );
}
console.log('✓ 5. 세트 비활성화 시 공유 도구 안전 보존 검증 완료');

// 6. 업종별 추천 세트 판별 검증
{
  const pianoSets = getRecommendedToolSetsForPreset('piano');
  assert.ok(pianoSets.includes('attendance_safety'), '피아노 학원은 안심 등하원 세트 추천');
  assert.ok(pianoSets.includes('billing_passes'), '피아노 학원은 수강료 세트 추천');
  assert.ok(pianoSets.includes('growth_records'), '피아노 학원은 성장 일지 세트 추천');
  assert.ok(pianoSets.includes('staff_operations'), '전 업종 공통 직원 관리 세트 추천');

  const pilatesSets = getRecommendedToolSetsForPreset('pilates');
  assert.ok(pilatesSets.includes('booking_timeslot'), '필라테스는 예약 세트 추천');
  assert.ok(pilatesSets.includes('billing_passes'), '필라테스는 수강료 세트 추천');
  assert.ok(pilatesSets.includes('staff_operations'), '전 업종 공통 직원 관리 세트 추천');
}
console.log('✓ 6. 업종별 추천 세트 판별 검증 완료');

// 7. 특정 Capability의 소속 세트 역조회 검증
{
  const setsForWorkplacePolicy = getToolSetsForCapability('workplace_policy');
  assert.deepStrictEqual(setsForWorkplacePolicy, ['staff_operations'], 'workplace_policy는 staff_operations 세트에 속해야 함');

  const setsForSeatRoom = getToolSetsForCapability('seat_room');
  assert.ok(setsForSeatRoom.includes('booking_timeslot'), 'seat_room은 booking_timeslot에 포함');
  assert.ok(setsForSeatRoom.includes('space_rental'), 'seat_room은 space_rental에 포함');
}
console.log('✓ 7. 특정 Capability의 소속 세트 역조회 검증 완료');

// 8. 현재 활성 Capability 목록으로부터 충족된 세트 역판별 검증
{
  const fullAttendanceCaps: CapabilityId[] = ['attendance', 'vehicle_shuttle', 'parent', 'emergency_alert_broadcast', 'roster'];
  const activeToolSets = getActiveToolSetIdsFromCapabilities(fullAttendanceCaps);
  assert.ok(activeToolSets.includes('attendance_safety'), 'attendance_safety의 모든 부품이 활성화되어 있으면 감지되어야 함');
  assert.strictEqual(activeToolSets.includes('retail_commerce'), false, '부품이 없는 retail_commerce는 미감지되어야 함');
}
console.log('✓ 8. 충족된 세트 역판별 검증 완료');

console.log('[test:operation-bundles] all tests passed successfully! (100%)');
