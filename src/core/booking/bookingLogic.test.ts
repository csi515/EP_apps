import assert from 'node:assert/strict';
import {
  calculateCancellationDeadline,
  calculateRefundWithPenalty,
  prioritizeSessionPassConsumption,
  type PenaltyTier,
  type SessionPassItem,
} from './bookingLogic';

async function runTests() {
  console.log('Running bookingLogic unit tests...');

  // =========================================================================
  // 1. calculateCancellationDeadline
  // =========================================================================
  {
    const start = '2026-10-15T14:00:00.000Z';
    const cutoffMinutes = 120; // 2시간 전 마감

    // 1.1 3시간 전 취소 (여유 있음)
    const current1 = '2026-10-15T11:00:00.000Z';
    const res1 = calculateCancellationDeadline(start, cutoffMinutes, current1);
    assert.equal(res1.isCancellable, true);
    assert.equal(res1.minutesRemaining, 60); // 마감까지 1시간 남음
    assert.equal(res1.deadlineDate.toISOString(), '2026-10-15T12:00:00.000Z');

    // 1.2 마감 시한 정각 (120분 전)
    const current2 = '2026-10-15T12:00:00.000Z';
    const res2 = calculateCancellationDeadline(start, cutoffMinutes, current2);
    assert.equal(res2.isCancellable, true);
    assert.equal(res2.minutesRemaining, 0);

    // 1.3 마감 시한 1분 지남 (119분 전)
    const current3 = '2026-10-15T12:01:00.000Z';
    const res3 = calculateCancellationDeadline(start, cutoffMinutes, current3);
    assert.equal(res3.isCancellable, false);
    assert.equal(res3.reason, 'deadline_passed');

    // 1.4 이미 시작된 이후 (시작 10분 후)
    const current4 = '2026-10-15T14:10:00.000Z';
    const res4 = calculateCancellationDeadline(start, cutoffMinutes, current4);
    assert.equal(res4.isCancellable, false);
    assert.equal(res4.reason, 'already_started');
  }

  // =========================================================================
  // 2. calculateRefundWithPenalty
  // =========================================================================
  {
    const start = '2026-10-20T10:00:00.000Z';
    const originalAmount = 50_000;
    const tiers: PenaltyTier[] = [
      { minutesBeforeStart: 60, penaltyRate: 0.5 },    // 1시간 이내: 50% 위약금
      { minutesBeforeStart: 1440, penaltyRate: 0.1 },  // 24시간 이내: 10% 위약금
    ];

    // 2.1 48시간 전 취소 -> 위약금 0원, 전액 환불
    const req1 = '2026-10-18T10:00:00.000Z';
    const refund1 = calculateRefundWithPenalty(originalAmount, start, req1, tiers);
    assert.equal(refund1.penaltyRate, 0);
    assert.equal(refund1.penaltyAmount, 0);
    assert.equal(refund1.refundAmount, 50_000);
    assert.equal(refund1.penaltyAmount + refund1.refundAmount, originalAmount);

    // 2.2 12시간 전 취소 -> 1440분 미만이므로 10% 위약금
    const req2 = '2026-10-19T22:00:00.000Z';
    const refund2 = calculateRefundWithPenalty(originalAmount, start, req2, tiers);
    assert.equal(refund2.penaltyRate, 0.1);
    assert.equal(refund2.penaltyAmount, 5_000);
    assert.equal(refund2.refundAmount, 45_000);
    assert.equal(refund2.penaltyAmount + refund2.refundAmount, originalAmount);

    // 2.3 30분 전 취소 -> 60분 미만이므로 50% 위약금
    const req3 = '2026-10-20T09:30:00.000Z';
    const refund3 = calculateRefundWithPenalty(originalAmount, start, req3, tiers);
    assert.equal(refund3.penaltyRate, 0.5);
    assert.equal(refund3.penaltyAmount, 25_000);
    assert.equal(refund3.refundAmount, 25_000);
    assert.equal(refund3.penaltyAmount + refund3.refundAmount, originalAmount);

    // 2.4 시작 후 취소 -> 100% 위약금, 환불 0원
    const req4 = '2026-10-20T10:05:00.000Z';
    const refund4 = calculateRefundWithPenalty(originalAmount, start, req4, tiers);
    assert.equal(refund4.penaltyRate, 1.0);
    assert.equal(refund4.penaltyAmount, 50_000);
    assert.equal(refund4.refundAmount, 0);
    assert.equal(refund4.penaltyAmount + refund4.refundAmount, originalAmount);
  }

  // =========================================================================
  // 3. prioritizeSessionPassConsumption
  // =========================================================================
  {
    const now = '2026-10-12T12:00:00.000Z';
    const passes: SessionPassItem[] = [
      {
        id: 'pass-expired',
        passType: 'times_10',
        remainingUnits: 5,
        expiresAt: '2026-10-10T00:00:00.000Z', // 이미 만료됨
        status: 'active',
      },
      {
        id: 'pass-zero',
        passType: 'times_10',
        remainingUnits: 0, // 잔여 횟수 없음
        expiresAt: '2026-10-20T00:00:00.000Z',
        status: 'active',
      },
      {
        id: 'pass-suspended',
        passType: 'times_10',
        remainingUnits: 8,
        expiresAt: '2026-10-20T00:00:00.000Z',
        status: 'suspended', // 정지 상태
      },
      {
        id: 'pass-later',
        passType: 'times_10',
        remainingUnits: 10,
        expiresAt: '2026-11-30T00:00:00.000Z', // 늦게 만료
        status: 'active',
      },
      {
        id: 'pass-soon',
        passType: 'times_10',
        remainingUnits: 2,
        expiresAt: '2026-10-15T00:00:00.000Z', // 곧 만료
        status: 'active',
      },
    ];

    const prioritized = prioritizeSessionPassConsumption(passes, now);

    // 유효하지 않은 패스 3개는 필터링되어야 함
    assert.equal(prioritized.length, 2);
    // 가장 먼저 만료되는 pass-soon이 1위여야 함!
    assert.equal(prioritized[0].id, 'pass-soon');
    assert.equal(prioritized[1].id, 'pass-later');
  }

  console.log('bookingLogic tests passed successfully!');
}

void runTests();
