import assert from 'node:assert/strict';
import {
  calculateGpsDistanceMeters,
  verifyAttendanceCheckIn,
  calculateDailyTimecardHours,
  calculateWeeklyHolidayHours,
  calculateStatutoryPay,
  calculateInsuranceDeductions,
  generatePayrollSlip,
  type StaffEmploymentProfile,
} from './workAttendancePayrollEngine';

console.log('--- Testing workAttendancePayrollEngine ---');

// Test 1: GPS 거리 및 반경 인증
{
  const store = { latitude: 37.4979, longitude: 127.0276 }; // 강남역 부근
  const insideStaff = { latitude: 37.4980, longitude: 127.0277 }; // 약 14미터 거리
  const outsideStaff = { latitude: 37.5050, longitude: 127.0350 }; // 약 1km 거리

  const distInside = calculateGpsDistanceMeters(store, insideStaff);
  assert.ok(distInside <= 30, `매장 내부 거리는 30m 이내여야 함 (실측: ${distInside}m)`);

  const authSuccess = verifyAttendanceCheckIn({
    storeLocation: store,
    staffLocation: insideStaff,
    maxRadiusMeters: 50,
  });
  assert.equal(authSuccess.isAuthenticated, true);
  assert.equal(authSuccess.method, 'gps');

  const authFail = verifyAttendanceCheckIn({
    storeLocation: store,
    staffLocation: outsideStaff,
    maxRadiusMeters: 50,
  });
  assert.equal(authFail.isAuthenticated, false);
  assert.ok(authFail.failureReason?.includes('매장 반경(50m)을 벗어났습니다'));

  console.log('✅ Test 1 passed: GPS distance calculation and geofence auth');
}

// Test 2: Wi-Fi BSSID 인증
{
  const authWifi = verifyAttendanceCheckIn({
    storeWifiBssid: 'AA:BB:CC:DD:EE:FF',
    staffWifiBssid: 'aa:bb:cc:dd:ee:ff', // 대소문자 무관
  });
  assert.equal(authWifi.isAuthenticated, true);
  assert.equal(authWifi.method, 'wifi');
  console.log('✅ Test 2 passed: Store Wi-Fi BSSID matching auth');
}

// Test 3: 일일 근로시간, 연장시간(>8h), 야간시간(22~06) 계산
{
  // 13:00 ~ 23:00 (총 10시간 근무, 휴게 60분 -> 실근로 9시간)
  // 기본근로 8시간, 연장근로 1시간, 야간근로(22~23시) 1시간
  const timecard = calculateDailyTimecardHours(
    '2026-10-15T13:00:00',
    '2026-10-15T23:00:00',
    60
  );

  assert.equal(timecard.totalWorkedHours, 9.0);
  assert.equal(timecard.regularHours, 8.0);
  assert.equal(timecard.overtimeHours, 1.0);
  assert.equal(timecard.nightHours, 1.0);

  console.log('✅ Test 3 passed: Daily timecard worked hours, overtime, and night hours');
}

// Test 4: 근로기준법 주휴시간 계산 (주 15시간 미만 vs 이상)
{
  // 1주 14시간 (15시간 미만) -> 주휴수당 0시간
  assert.equal(calculateWeeklyHolidayHours(14), 0);

  // 1주 20시간 근무 -> (20 / 40) * 8 = 4시간 주휴시간
  assert.equal(calculateWeeklyHolidayHours(20), 4.0);

  // 1주 40시간 이상 근무 -> 최대 8시간 주휴시간
  assert.equal(calculateWeeklyHolidayHours(45), 8.0);

  console.log('✅ Test 4 passed: Statutory weekly holiday hours (<15h vs >=15h)');
}

// Test 5: 법정 급여명세서 및 4대보험 공제 계산
{
  const partTimeStaff: StaffEmploymentProfile = {
    staffId: 'STAFF-01',
    staffName: '김알바',
    employmentType: 'hourly_part_time',
    hourlyRate: 10000,
    contractWeeklyHours: 20,
    enrollSocialInsurance: true,
  };

  // 주당 20시간씩 4주 근무 = 총 80시간, 주휴시간 매주 4시간 * 4주 = 16시간
  // 연장 2시간, 야간 4시간
  const slip = generatePayrollSlip(
    partTimeStaff,
    '2026-10',
    [20, 20, 20, 20],
    2, // 연장 2시간
    4  // 야간 4시간
  );

  // 기본급: 80h * 10,000 = 800,000원
  assert.equal(slip.statutoryPay.regularPay, 800000);
  // 주휴수당: 16h * 10,000 = 160,000원
  assert.equal(slip.statutoryPay.weeklyHolidayPay, 160000);
  // 연장가산수당: 2h * 10,000 * 1.5 = 30,000원
  assert.equal(slip.statutoryPay.overtimePay, 30000);
  // 야간가산수당: 4h * 10,000 * 0.5 = 20,000원
  assert.equal(slip.statutoryPay.nightPay, 20000);
  // 세전 총급여: 800,000 + 160,000 + 30,000 + 20,000 = 1,010,000원
  assert.equal(slip.statutoryPay.totalGrossPay, 1010000);

  // 4대 보험 공제 검증
  assert.ok(slip.deductions.nationalPension > 0);
  assert.ok(slip.deductions.healthInsurance > 0);
  assert.ok(slip.deductions.employmentInsurance > 0);
  assert.ok(slip.netPay < slip.statutoryPay.totalGrossPay);
  assert.equal(slip.netPay, slip.statutoryPay.totalGrossPay - slip.deductions.totalDeductions);

  console.log('✅ Test 5 passed: Full payroll slip generation with statutory allowances and deductions');
}

console.log('🎉 All workAttendancePayrollEngine tests passed successfully!');
