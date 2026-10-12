/**
 * Booking & Scheduling Domain Logic (Pure Domain Functions)
 * 
 * 도메인 주도 비즈니스 워크플로우:
 * 1. 분 단위 취소 마감 시한 계산
 * 2. 시한별 위약금 차감 및 환불액 계산
 * 3. 수강권/세션패스 최적 우선 소진 정렬
 * 
 * 외부 프레임워크나 DB 종속성이 전혀 없는 순수 함수로 구성되어
 * testing.mdc 규격의 단위 테스트로 상시 검증 가능함.
 */

export interface PenaltyTier {
  /** 시작 몇 분 전까지 해당하는지 (예: 1440 = 24시간 전, 120 = 2시간 전, 0 = 시작 직전) */
  minutesBeforeStart: number;
  /** 위약금 비율 (0.0 ~ 1.0) */
  penaltyRate: number;
}

export interface CancellationWindowResult {
  isCancellable: boolean;
  deadlineDate: Date;
  minutesRemaining: number;
  reason?: 'deadline_passed' | 'already_started' | 'invalid_datetime';
}

export interface RefundCalculationResult {
  originalAmount: number;
  penaltyRate: number;
  penaltyAmount: number;
  refundAmount: number;
  appliedTierMinutes: number | null;
}

export interface SessionPassItem {
  id: string;
  passType: string;
  remainingUnits: number;
  expiresAt: string; // ISO date string
  priorityRank?: number;
  status: 'active' | 'suspended' | 'expired';
}

/**
 * 분 단위 취소 마감 시한 계산
 * @param scheduledStartsAt 예약 시작 일시
 * @param cutoffMinutes 예약 시작 전 취소 마감 시한(분) (예: 60분 전)
 * @param currentAt 기준 일시 (기본값: 현재 시각)
 */
export function calculateCancellationDeadline(
  scheduledStartsAt: string | Date,
  cutoffMinutes: number,
  currentAt: string | Date = new Date()
): CancellationWindowResult {
  const startTime = new Date(scheduledStartsAt).getTime();
  const nowTime = new Date(currentAt).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(nowTime)) {
    return {
      isCancellable: false,
      deadlineDate: new Date(0),
      minutesRemaining: 0,
      reason: 'invalid_datetime',
    };
  }

  // 마감 일시 = 시작 일시 - cutoff 분
  const deadlineTime = startTime - cutoffMinutes * 60 * 1000;
  const deadlineDate = new Date(deadlineTime);

  if (nowTime > startTime) {
    return {
      isCancellable: false,
      deadlineDate,
      minutesRemaining: 0,
      reason: 'already_started',
    };
  }

  const msRemaining = deadlineTime - nowTime;
  const minutesRemaining = Math.floor(msRemaining / (60 * 1000));

  if (msRemaining < 0) {
    return {
      isCancellable: false,
      deadlineDate,
      minutesRemaining: 0,
      reason: 'deadline_passed',
    };
  }

  return {
    isCancellable: true,
    deadlineDate,
    minutesRemaining,
  };
}

/**
 * 위약금 차감 및 환불 계산
 * @param originalAmount 결제 원금 (원 단위)
 * @param scheduledStartsAt 예약 시작 일시
 * @param requestedAt 취소 요청 일시
 * @param penaltyTiers 위약 차감 단계 (minutesBeforeStart 기준 내림차순 권장)
 */
export function calculateRefundWithPenalty(
  originalAmount: number,
  scheduledStartsAt: string | Date,
  requestedAt: string | Date,
  penaltyTiers: PenaltyTier[]
): RefundCalculationResult {
  if (originalAmount <= 0) {
    return {
      originalAmount: 0,
      penaltyRate: 0,
      penaltyAmount: 0,
      refundAmount: 0,
      appliedTierMinutes: null,
    };
  }

  const startTime = new Date(scheduledStartsAt).getTime();
  const reqTime = new Date(requestedAt).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(reqTime)) {
    throw new Error('Invalid date provided for refund calculation');
  }

  const diffMs = startTime - reqTime;
  const minutesBeforeStart = Math.floor(diffMs / (60 * 1000));

  // 시작 이후 취소인 경우 100% 위약금
  if (minutesBeforeStart < 0) {
    return {
      originalAmount,
      penaltyRate: 1.0,
      penaltyAmount: originalAmount,
      refundAmount: 0,
      appliedTierMinutes: 0,
    };
  }

  // 티어를 minutesBeforeStart 오름차순으로 정렬하여 취소 시점보다 큰 가장 가까운 단계 탐색
  const sortedTiers = [...penaltyTiers].sort(
    (a, b) => a.minutesBeforeStart - b.minutesBeforeStart
  );

  let appliedRate = 0;
  let appliedTierMinutes: number | null = null;

  // ex) tiers: [ { minutesBeforeStart: 60, penaltyRate: 0.5 }, { minutesBeforeStart: 1440, penaltyRate: 0.1 } ]
  // 남은 시간이 30분이면: 60분 미만이므로 100% 또는 최고 위약률
  // 남은 시간이 120분이면: 60분 이상 1440분 미만이므로 0.5 적용
  // 남은 시간이 2000분이면: 1440분 이상이므로 0.0 (또는 최저 위약률)
  let found = false;
  for (const tier of sortedTiers) {
    if (minutesBeforeStart < tier.minutesBeforeStart) {
      appliedRate = tier.penaltyRate;
      appliedTierMinutes = tier.minutesBeforeStart;
      found = true;
      break;
    }
  }

  if (!found) {
    // 가장 넉넉한 사전 취소 기준을 통과한 경우 위약금 0%
    appliedRate = 0;
    appliedTierMinutes = null;
  }

  // 클램프 (0.0 ~ 1.0)
  appliedRate = Math.max(0, Math.min(1, appliedRate));

  const penaltyAmount = Math.round(originalAmount * appliedRate);
  const refundAmount = Math.max(0, originalAmount - penaltyAmount);

  return {
    originalAmount,
    penaltyRate: appliedRate,
    penaltyAmount,
    refundAmount,
    appliedTierMinutes,
  };
}

/**
 * 수강권 우선 소진 정렬 (만료 임박순 & 잔여 횟수 우선)
 * 1. 유효기간(expiresAt) 임박순
 * 2. 우선순위 랭크(priorityRank) 높은 순
 * 3. 횟수권 우선 (잔여 유닛 적은 순)
 * 4. ID 결정론적 정렬
 */
export function prioritizeSessionPassConsumption(
  passes: SessionPassItem[],
  currentAt: string | Date = new Date()
): SessionPassItem[] {
  const nowIso = new Date(currentAt).toISOString();

  const validPasses = passes.filter((p) => {
    if (p.status !== 'active') return false;
    if (p.remainingUnits <= 0) return false;
    if (p.expiresAt && p.expiresAt < nowIso) return false;
    return true;
  });

  return validPasses.sort((a, b) => {
    // 1. 만료일 임박순 (오름차순)
    const expA = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
    const expB = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
    if (expA !== expB) {
      return expA - expB;
    }

    // 2. 명시적 우선순위 랭크 (내림차순)
    const rankA = a.priorityRank ?? 0;
    const rankB = b.priorityRank ?? 0;
    if (rankA !== rankB) {
      return rankB - rankA;
    }

    // 3. 잔여 횟수 적은 순 (소진 유도)
    if (a.remainingUnits !== b.remainingUnits) {
      return a.remainingUnits - b.remainingUnits;
    }

    // 4. ID 결정론적 정렬
    return a.id.localeCompare(b.id);
  });
}
