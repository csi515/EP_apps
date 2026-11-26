import assert from 'node:assert/strict';
import {
  aggregateStopHeadcounts,
  canActivateShuttleRegistration,
  canManageShuttle,
  normalizeDriverPhoneForTel,
  scheduleRowsToStopDrafts,
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

  const scheduleStops = scheduleRowsToStopDrafts([
    { time: '05:49', stop_name: '신대 정류장', remark: '' },
    { time: '07:05', stop_name: '회사', remark: '퇴근 17:45 출발' },
  ]);
  assert.equal(scheduleStops.length, 2);
  assert.equal(scheduleStops[0].is_pickup, true);
  assert.equal(scheduleStops[0].pickup_time, '05:49');
  assert.equal(scheduleStops[1].is_dropoff, true);
  assert.equal(scheduleStops[1].dropoff_time, '07:05');
  assert.equal(validateStopsSequence(scheduleStops).isValid, true);

  assert.equal(canActivateShuttleRegistration(44, 45, false), true);
  assert.equal(canActivateShuttleRegistration(45, 45, false), false);
  assert.equal(canActivateShuttleRegistration(45, 45, true), true);
  assert.equal(canActivateShuttleRegistration(0, 0, false), false);
  assert.equal(canActivateShuttleRegistration(-1, 10, false), false, 'negative count fail-closed');
  assert.equal(canActivateShuttleRegistration(3, Number.NaN, false), false);
  assert.equal(canActivateShuttleRegistration(3, 1.5, false), false, 'non-integer capacity');

  assert.equal(canManageShuttle({ role: 'admin', permissions: {} }), true);
  assert.equal(
    canManageShuttle({ role: 'staff', permissions: { 'shuttle:dispatch:operate': true } }),
    true,
  );

  const oneStop = validateStopsSequence([
    { stop_order: 1, stop_name: '단일', pickup_time: '07:00' },
  ]);
  assert.equal(oneStop.isValid, false);

  const inactiveOnly: ShuttleRegistration[] = [
    {
      id: 'x',
      member_id: 'm9',
      route_id: 'r1',
      pickup_stop_id: 's1',
      dropoff_stop_id: 's2',
      is_active: false,
    },
  ];
  const inactiveReport = aggregateStopHeadcounts(inactiveOnly, stops);
  assert.equal(inactiveReport[0].pickupCount, 0);
  assert.equal(inactiveReport[0].onboardAfter, 0);

  const noRoute: ShuttleRegistration[] = [
    {
      id: 'y',
      member_id: 'm8',
      route_id: null,
      pickup_stop_id: 's1',
      dropoff_stop_id: 's2',
      is_active: true,
    },
  ];
  const noRouteReport = aggregateStopHeadcounts(noRoute, stops);
  assert.equal(noRouteReport[0].pickupCount, 0);

  console.log('shuttleRosterEngine.test.ts: ok');
}

run();
