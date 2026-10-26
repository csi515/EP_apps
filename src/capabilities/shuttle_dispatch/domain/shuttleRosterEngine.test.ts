import assert from 'node:assert/strict';
import {
  aggregateStopHeadcounts,
  canManageShuttle,
  normalizeDriverPhoneForTel,
  validateRouteForm,
  validateStopsSequence,
  type ShuttleRegistration,
  type ShuttleStop,
} from './shuttleRosterEngine';

function run() {
  assert.equal(canManageShuttle({ role: 'owner', permissions: {} }), true);
  assert.equal(canManageShuttle({ role: 'staff', permissions: { 'shuttle:manage': true } }), true);
  assert.equal(canManageShuttle({ role: 'staff', permissions: { 'shuttle:routes:manage': true } }), true);
  assert.equal(canManageShuttle({ role: 'staff', permissions: {} }), false);

  const okRoute = validateRouteForm({
    name: '퇴근 1호차',
    direction: 'FROM_WORK',
    departureTime: '18:30',
    capacity: 45,
    driverName: '김기사',
    driverPhone: '010-1234-5678',
  });
  assert.equal(okRoute.isValid, true);

  const okEmptyPhone = validateRouteForm({
    name: '출근 버스',
    direction: 'TO_WORK',
    departureTime: '07:30',
    capacity: 40,
    driverPhone: '',
  });
  assert.equal(okEmptyPhone.isValid, true);

  const badPhone = validateRouteForm({
    name: '노선',
    direction: 'TO_WORK',
    departureTime: '07:30',
    capacity: 40,
    driverPhone: 'call-me@now',
  });
  assert.equal(badPhone.isValid, false);

  assert.equal(normalizeDriverPhoneForTel('010-1234-5678'), '01012345678');
  assert.equal(normalizeDriverPhoneForTel('  '), null);

  const badRoute = validateRouteForm({
    name: '  ',
    direction: 'TO_WORK',
    departureTime: '99:00',
    capacity: 0,
  });
  assert.equal(badRoute.isValid, false);

  const okStops = validateStopsSequence([
    { stop_order: 1, stop_name: '사옥', pickup_time: '18:30', dropoff_time: null },
    { stop_order: 2, stop_name: '정자역', pickup_time: '18:45', dropoff_time: '18:50' },
  ]);
  assert.equal(okStops.isValid, true);

  const reversed = validateStopsSequence([
    { stop_order: 1, stop_name: 'A', pickup_time: '18:40' },
    { stop_order: 2, stop_name: 'B', pickup_time: '18:30' },
  ]);
  assert.equal(reversed.isValid, false);

  const dupOrder = validateStopsSequence([
    { stop_order: 1, stop_name: 'A' },
    { stop_order: 1, stop_name: 'B' },
  ]);
  assert.equal(dupOrder.isValid, false);

  const stops: ShuttleStop[] = [
    { id: 's1', route_id: 'r1', stop_order: 1, stop_name: '사옥', pickup_time: '18:30' },
    { id: 's2', route_id: 'r1', stop_order: 2, stop_name: '정자', dropoff_time: '18:55' },
  ];
  const regs: ShuttleRegistration[] = [
    {
      id: '1',
      member_id: 'm1',
      route_id: 'r1',
      pickup_stop_id: 's1',
      dropoff_stop_id: 's2',
      is_active: true,
    },
    {
      id: '2',
      member_id: 'm2',
      route_id: 'r1',
      pickup_stop_id: 's1',
      dropoff_stop_id: 's2',
      is_active: true,
    },
    {
      id: '3',
      member_id: 'm3',
      route_id: 'r1',
      pickup_stop_id: 's1',
      dropoff_stop_id: null,
      is_active: false,
    },
  ];

  const report = aggregateStopHeadcounts(regs, stops);
  assert.equal(report[0].pickupCount, 2);
  assert.equal(report[0].onboardAfter, 2);
  assert.equal(report[1].dropoffCount, 2);
  assert.equal(report[1].onboardAfter, 0);

  console.log('shuttleRosterEngine.test.ts: ok');
}

run();
