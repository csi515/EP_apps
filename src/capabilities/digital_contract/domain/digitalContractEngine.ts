/**
 * 현장 전자계약 & 환불 규정 서명 보관 도메인 엔진 (Pure Functions)
 *
 * 적용 업종: 1:1 PT샵(pt_fitness), 헬스장(gym_fitness), 학원 8종, 미용실, 스파
 *
 * 주요 기능:
 *  1. 표준이용계약서(PT, 회원권, 수강료) 및 표준근로계약서 조항 관리
 *  2. 공정거래위원회 표준약관 기반 중도 해지 위약금(10%) 및 일할/회차 차감 환불금 자동 산출
 *  3. 계약 기간 만료 D-Day 계산 및 계약 상태머신 (ACTIVE -> EXPIRED / TERMINATED / REFUNDED)
 */

export type ContractTemplateType =
  | 'personal_training' // 1:1 PT 및 레슨 이용계약서
  | 'membership_pass' // 피트니스/시설 정기 회원권 계약서
  | 'academy_tuition' // 학원 수강 등록 및 교습비 계약서
  | 'staff_employment'; // 파트타임 강사/직원 표준근로계약서

export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'REFUNDED';

export interface ContractClause {
  id: string;
  title: string;
  content: string;
  mandatory: boolean;
}

export interface SignedContract {
  id: string;
  contractNumber: string; // e.g. "CTR-202610-001"
  templateType: ContractTemplateType;
  title: string;
  customerName: string;
  customerPhone: string;
  totalContractAmount: number; // 총 계약금액
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalSessionsOrDays: number; // 총 등록 회차 또는 총 일수
  usedSessionsOrDays: number; // 현재 소진된 회차 또는 이용 일수
  signatureDataUrl?: string; // 자필 전자서명 이미지
  signedAt: string; // ISO String
  status: ContractStatus;
  notes?: string;
}

export interface RefundCalculationResult {
  contractNumber: string;
  totalAmount: number;
  usedAmount: number; // 이용 대가 (단가 * 소진 회차/일수)
  penaltyAmount: number; // 위약금 (총액의 10%)
  refundableAmount: number; // 최종 환불 예상액 = 총액 - 이용대가 - 위약금
  deductionSummary: string;
}

export interface ContractSummaryMetrics {
  totalContractCount: number;
  activeCount: number;
  expiredCount: number;
  refundedCount: number;
  totalContractValue: number;
}

/**
 * 1. 공정위 표준약관 기준 중도 해지 환불금 산출 (순수 함수)
 *    환불금 = 총 결제금액 - 이용 대가(일할 또는 1회 정상단가 차감) - 위약금(총 결제금액의 10%)
 */
export function calculateRefundEstimate(
  contract: SignedContract,
  usedUnits: number,
  penaltyRatePercent = 10
): RefundCalculationResult {
  const safeUsed = Math.min(contract.totalSessionsOrDays, Math.max(0, usedUnits));
  const unitPrice =
    contract.totalSessionsOrDays > 0
      ? contract.totalContractAmount / contract.totalSessionsOrDays
      : 0;

  const usedAmount = Math.round(safeUsed * unitPrice);
  const penaltyAmount = Math.round((contract.totalContractAmount * penaltyRatePercent) / 100);
  const refundableAmount = Math.max(0, contract.totalContractAmount - usedAmount - penaltyAmount);

  return {
    contractNumber: contract.contractNumber,
    totalAmount: contract.totalContractAmount,
    usedAmount,
    penaltyAmount,
    refundableAmount,
    deductionSummary: `이용대가 ${usedAmount.toLocaleString()}원(${safeUsed}/${contract.totalSessionsOrDays}) + 위약금(${penaltyRatePercent}%) ${penaltyAmount.toLocaleString()}원 차감`,
  };
}

/**
 * 2. 계약 유효기간 기준 실시간 상태 평가 (순수 함수)
 */
export function evaluateContractStatus(
  contract: SignedContract,
  currentDate?: string
): ContractStatus {
  if (contract.status === 'TERMINATED' || contract.status === 'REFUNDED') {
    return contract.status;
  }

  const today = currentDate ? new Date(currentDate) : new Date();
  const todayStr = today.toISOString().slice(0, 10);

  if (todayStr > contract.endDate || contract.usedSessionsOrDays >= contract.totalSessionsOrDays) {
    return 'EXPIRED';
  }

  return 'ACTIVE';
}

/**
 * 3. 전체 계약서 아카이브 통계 요약 (순수 함수)
 */
export function summarizeContracts(
  contracts: readonly SignedContract[],
  currentDate?: string
): ContractSummaryMetrics {
  let activeCount = 0;
  let expiredCount = 0;
  let refundedCount = 0;
  let totalContractValue = 0;

  for (const c of contracts) {
    totalContractValue += c.totalContractAmount;
    const effStatus = evaluateContractStatus(c, currentDate);
    if (effStatus === 'ACTIVE') activeCount++;
    else if (effStatus === 'EXPIRED') expiredCount++;
    else if (effStatus === 'REFUNDED') refundedCount++;
  }

  return {
    totalContractCount: contracts.length,
    activeCount,
    expiredCount,
    refundedCount,
    totalContractValue,
  };
}
