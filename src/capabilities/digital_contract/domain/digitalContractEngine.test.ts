import {
  SignedContract,
  calculateRefundEstimate,
  evaluateContractStatus,
  summarizeContracts,
} from './digitalContractEngine';

function runTests() {
  console.log('--- Testing digitalContractEngine ---');

  // Test 1: 공정위 표준약관 기반 PT 계약 해지 환불금 계산 (총액 100만원, 20회 중 5회 소진, 위약금 10%)
  const ptContract: SignedContract = {
    id: 'ctr-1',
    contractNumber: 'CTR-202610-001',
    templateType: 'personal_training',
    title: '1:1 VIP 퍼스널 트레이닝 20회 계약서',
    customerName: '김철수',
    customerPhone: '010-1234-5678',
    totalContractAmount: 1000000,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    totalSessionsOrDays: 20,
    usedSessionsOrDays: 5,
    signedAt: '2026-10-01T10:00:00Z',
    status: 'ACTIVE',
  };

  const refund = calculateRefundEstimate(ptContract, 5, 10);
  // 1회 단가: 1,000,000 / 20 = 50,000원
  // 5회 소진액: 250,000원
  // 위약금 (10%): 100,000원
  // 환불 예정액: 1,000,000 - 250,000 - 100,000 = 650,000원
  if (refund.usedAmount !== 250000) {
    throw new Error(`Expected used amount 250,000, got ${refund.usedAmount}`);
  }
  if (refund.penaltyAmount !== 100000) {
    throw new Error(`Expected penalty 100,000, got ${refund.penaltyAmount}`);
  }
  if (refund.refundableAmount !== 650000) {
    throw new Error(`Expected refund 650,000, got ${refund.refundableAmount}`);
  }
  console.log('✅ Test 1 passed: Fair Trade Commission standard refund calculation');

  // Test 2: 계약 상태 평가 (만료일 경과 및 세션 모두 소진)
  const expiredDateContract: SignedContract = {
    ...ptContract,
    endDate: '2026-10-10', // 2026-10-14 기준 경과
  };
  if (evaluateContractStatus(expiredDateContract, '2026-10-14') !== 'EXPIRED') {
    throw new Error('Expected contract to be EXPIRED due to end date');
  }

  const fullyUsedContract: SignedContract = {
    ...ptContract,
    usedSessionsOrDays: 20, // 20회 모두 소진
  };
  if (evaluateContractStatus(fullyUsedContract, '2026-10-05') !== 'EXPIRED') {
    throw new Error('Expected contract to be EXPIRED due to full usage');
  }
  console.log('✅ Test 2 passed: Contract status evaluation and expiry check');

  // Test 3: 전체 계약서 아카이브 통계 요약
  const summary = summarizeContracts([ptContract, expiredDateContract], '2026-10-14');
  if (summary.totalContractCount !== 2) {
    throw new Error(`Expected 2 contracts, got ${summary.totalContractCount}`);
  }
  if (summary.activeCount !== 1) {
    throw new Error(`Expected 1 active contract, got ${summary.activeCount}`);
  }
  if (summary.expiredCount !== 1) {
    throw new Error(`Expected 1 expired contract, got ${summary.expiredCount}`);
  }
  if (summary.totalContractValue !== 2000000) {
    throw new Error(`Expected total value 2,000,000, got ${summary.totalContractValue}`);
  }
  console.log('✅ Test 3 passed: Contract archive summary metrics');

  console.log('🎉 All digitalContractEngine tests passed!');
}

runTests();
