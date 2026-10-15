import assert from 'node:assert/strict';
import {
  resolveCapabilityDependencies,
  collectRequiredPrerequisites,
  collectDependentDependents,
} from './capabilityDependency';
import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';

function run() {
  // 1. 단독 켜기 (선행 의존성이 없는 기능)
  const initial: CapabilityId[] = ['roster'];
  const res1 = resolveCapabilityDependencies(initial, 'passes', true);
  assert.equal(res1.nextActive.includes('passes'), true);
  assert.equal(res1.autoEnabled.length, 0);

  // 2. 선행 의존 기능 자동 활성화 (booking 켤 때 passes가 꺼져있으면 함께 켜짐)
  const res2 = resolveCapabilityDependencies(['roster'], 'booking', true);
  assert.equal(res2.nextActive.includes('booking'), true);
  assert.equal(res2.nextActive.includes('passes'), true);
  assert.equal(res2.autoEnabled.includes('passes'), true);

  // 3. 이미 선행 의존 기능이 켜져 있을 때 (passes가 이미 있으면 autoEnabled 없음)
  const res3 = resolveCapabilityDependencies(['roster', 'passes'], 'booking', true);
  assert.equal(res3.nextActive.includes('booking'), true);
  assert.equal(res3.autoEnabled.length, 0);

  // 4. 단독 끄기 (의존하는 하위 기능이 없는 경우)
  const res4 = resolveCapabilityDependencies(['roster', 'passes', 'booking'], 'booking', false);
  assert.equal(res4.nextActive.includes('booking'), false);
  assert.equal(res4.nextActive.includes('passes'), true);
  assert.equal(res4.autoDisabled.length, 0);

  // 5. 필수 선행 기능을 끌 때 하위 기능 연쇄 비활성화
  // roster를 끄면 이를 의존하는 attendance, locker, diet_body_log 등이 함께 꺼짐
  const activeWithDependents: CapabilityId[] = [
    'roster',
    'attendance',
    'locker',
    'diet_body_log',
    'inventory',
  ];
  const res5 = resolveCapabilityDependencies(activeWithDependents, 'roster', false);
  assert.equal(res5.nextActive.includes('roster'), false);
  assert.equal(res5.nextActive.includes('attendance'), false);
  assert.equal(res5.nextActive.includes('locker'), false);
  assert.equal(res5.nextActive.includes('diet_body_log'), false);
  assert.equal(res5.nextActive.includes('inventory'), true); // 무관한 기능은 유지
  assert.equal(res5.autoDisabled.length, 3);
  assert.ok(res5.autoDisabled.includes('attendance'));
  assert.ok(res5.autoDisabled.includes('locker'));
  assert.ok(res5.autoDisabled.includes('diet_body_log'));

  // 6. shift_schedule 끄기 -> instructor_match, commission_payroll 연쇄 비활성화
  const shiftActive: CapabilityId[] = [
    'shift_schedule',
    'instructor_match',
    'commission_payroll',
  ];
  const res6 = resolveCapabilityDependencies(shiftActive, 'shift_schedule', false);
  assert.equal(res6.nextActive.includes('shift_schedule'), false);
  assert.equal(res6.nextActive.includes('instructor_match'), false);
  assert.equal(res6.nextActive.includes('commission_payroll'), false);
  assert.equal(res6.autoDisabled.length, 2);

  // 7. 멱등성 검증 (이미 켜져있는 것을 켜거나, 이미 꺼져있는 것을 끌 때 상태 불변)
  const resIdempotentOn = resolveCapabilityDependencies(['roster', 'passes'], 'passes', true);
  assert.deepEqual(resIdempotentOn.nextActive, ['roster', 'passes']);
  assert.equal(resIdempotentOn.autoEnabled.length, 0);

  const resIdempotentOff = resolveCapabilityDependencies(['roster'], 'passes', false);
  assert.deepEqual(resIdempotentOff.nextActive, ['roster']);
  assert.equal(resIdempotentOff.autoDisabled.length, 0);

  console.log('capabilityDependency.test.ts: ok (with DAG autoEnabled & autoDisabled)');
}

run();
