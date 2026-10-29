/**
 * MBO Domain Engine Unit Tests
 * Run: npx tsx src/capabilities/mbo/domain/mboEngine.test.ts
 */

import assert from 'node:assert/strict';
import {
  canTransitionMboStatus,
  detectHierarchyCycle,
  calculateWeightedObjectiveProgress,
  calculateGradeFromScore,
  validateEvaluationPayload,
  canAccessEvaluation,
  validateMboObjectiveWeights,
  calculateMultiStageMboEvaluationScore,
  evaluateMboDistributionCompliance,
} from './mboEngine';

console.log('=== [1] MBO State Machine Transition Invariants ===');

// 1.1 일반 직원의 승인 요청 및 직접 승인 차단
assert.equal(canTransitionMboStatus('draft', 'submitted', { isManager: false }).allowed, true);
const staffSelfApprove = canTransitionMboStatus('draft', 'approved', { isManager: false });
assert.equal(staffSelfApprove.allowed, false, '일반 직원은 본인 계획을 직접 승인할 수 없습니다.');

// 1.2 관리자의 승인 및 반려
assert.equal(canTransitionMboStatus('submitted', 'approved', { isManager: true }).allowed, true);

// 반려 시 사유 누락 방어
const rejectWithoutReason = canTransitionMboStatus('submitted', 'rejected', {
  isManager: true,
  rejectionReason: '',
});
assert.equal(rejectWithoutReason.allowed, false, '반려 시 구체적인 사유가 필수여야 합니다.');

// 반려 사유 포함 시 정상 허용
const rejectWithReason = canTransitionMboStatus('submitted', 'rejected', {
  isManager: true,
  rejectionReason: '목표 달성 지표(KPI)가 불명확하여 구체화 필요',
});
assert.equal(rejectWithReason.allowed, true);

// 1.3 반려 후 재작성 및 재제출
assert.equal(canTransitionMboStatus('rejected', 'draft').allowed, true);
assert.equal(canTransitionMboStatus('rejected', 'submitted').allowed, true);

// 1.4 승인된 계획의 실행 및 완료
assert.equal(canTransitionMboStatus('approved', 'in_progress').allowed, true);
assert.equal(canTransitionMboStatus('in_progress', 'completed').allowed, true);

// 1.5 완료/취소 상태의 불변성
assert.equal(canTransitionMboStatus('completed', 'in_progress').allowed, false);
assert.equal(canTransitionMboStatus('canceled', 'draft').allowed, false);
console.log('  -> MBO 상태 전이 불변식 검증 성공');

console.log('=== [2] Hierarchy Cycle Prevention (순환 참조 방지) ===');

const mockTree = [
  { id: 'company_kpi', parentId: null },
  { id: 'dept_dev', parentId: 'company_kpi' },
  { id: 'team_frontend', parentId: 'dept_dev' },
  { id: 'ind_member_a', parentId: 'team_frontend' },
];

// 2.1 최상위 노드로 설정 (안전)
assert.equal(detectHierarchyCycle(mockTree, 'ind_member_a', null), false);

// 2.2 다른 브랜치로 부모 변경 (안전)
assert.equal(detectHierarchyCycle(mockTree, 'ind_member_a', 'dept_dev'), false);

// 2.3 자기 자신을 부모로 지정 (차단)
assert.equal(detectHierarchyCycle(mockTree, 'dept_dev', 'dept_dev'), true);

// 2.4 하위 노드를 부모로 지정하는 순환 (차단)
// dept_dev의 부모를 team_frontend로 바꾸면 dept_dev -> team_frontend -> dept_dev 순환 발생
assert.equal(detectHierarchyCycle(mockTree, 'dept_dev', 'team_frontend'), true);
// company_kpi의 부모를 최하위 ind_member_a로 바꾸면 순환 발생
assert.equal(detectHierarchyCycle(mockTree, 'company_kpi', 'ind_member_a'), true);
console.log('  -> 목표 계층 순환 참조 차단 알고리즘 검증 성공');

console.log('=== [3] Weighted Progress Calculation (가중치 종합 진척도) ===');

// 3.1 빈 목록
assert.equal(calculateWeightedObjectiveProgress([]), 0);

// 3.2 단일 항목
assert.equal(calculateWeightedObjectiveProgress([{ weight: 1, progressRate: 50 }]), 50);

// 3.3 가중치 복수 항목 (w1: 2 @ 100%, w2: 1 @ 40% => (200 + 40) / 3 = 80%)
const progress = calculateWeightedObjectiveProgress([
  { weight: 2, progressRate: 100 },
  { weight: 1, progressRate: 40 },
]);
assert.equal(progress, 80);

// 3.4 비정상 수치 클램핑 (음수, 100 초과)
const clampedProgress = calculateWeightedObjectiveProgress([
  { weight: 1, progressRate: 150 }, // 100으로 제한
  { weight: 1, progressRate: -20 }, // 0으로 제한
]);
assert.equal(clampedProgress, 50);
console.log('  -> 가중치 종합 진척도 산출 검증 성공');

console.log('=== [4] Evaluation Grade & Validation Invariants ===');

// 4.1 점수별 5단계 등급
assert.equal(calculateGradeFromScore(100), 'S');
assert.equal(calculateGradeFromScore(90), 'S');
assert.equal(calculateGradeFromScore(89.9), 'A');
assert.equal(calculateGradeFromScore(80), 'A');
assert.equal(calculateGradeFromScore(75), 'B');
assert.equal(calculateGradeFromScore(65), 'C');
assert.equal(calculateGradeFromScore(55), 'D');
assert.equal(calculateGradeFromScore(0), 'D');

// 4.2 페이로드 검증
const validPayload = validateEvaluationPayload({
  score: 88,
  qualitativeFeedback: '프로젝트 기한 내 핵심 요구사항 완성도 우수',
  evaluationType: 'manager',
});
assert.equal(validPayload.valid, true);

const invalidPayload = validateEvaluationPayload({
  score: 120, // 100점 초과
  qualitativeFeedback: '', // 빈 의견
  evaluationType: 'unknown' as any,
});
assert.equal(invalidPayload.valid, false);
assert.equal(invalidPayload.errors.length, 3);
console.log('  -> 평가 등급 및 유효성 검증 성공');

console.log('=== [5] Evaluation Access Control & Confidentiality Isolation ===');

const confidentialParams = {
  isConfidential: true,
  targetUserId: 'staff_1',
  evaluatorId: 'manager_1',
  currentUserId: 'staff_2', // 다른 일반 직원
  isOrgAdmin: false,
};

// 5.1 타인 비공개 평가 열람 차단
assert.equal(canAccessEvaluation(confidentialParams), false);

// 5.2 피평가자 본인 열람 허용
assert.equal(canAccessEvaluation({ ...confidentialParams, currentUserId: 'staff_1' }), true);

// 5.3 평가자 본인 열람 허용
assert.equal(canAccessEvaluation({ ...confidentialParams, currentUserId: 'manager_1' }), true);

// 5.4 조직 최고 관리자 열람 허용
assert.equal(canAccessEvaluation({ ...confidentialParams, isOrgAdmin: true }), true);

// 5.5 비공개 평가가 아닌 경우 타 직원도 열람 가능
assert.equal(canAccessEvaluation({ ...confidentialParams, isConfidential: false }), true);

// 5.6 조직 하위 리더는 대상자 기밀 평가 열람 가능
assert.equal(
  canAccessEvaluation({ ...confidentialParams, isSubtreeLeaderOfTarget: true }),
  true,
);
console.log('  -> 비공개 성과 평가 권한 격리 검증 성공');

console.log('=== [6] Objective Weights 100% Interlock Validation ===');

// 6.1 정확히 100%인 경우
const perfectWeights = validateMboObjectiveWeights([
  { weight: 40, title: '매출 성장' },
  { weight: 35, title: '고객 유지' },
  { weight: 25, title: '프로세스 혁신' },
]);
assert.equal(perfectWeights.valid, true);
assert.equal(perfectWeights.totalWeight, 100);
assert.equal(perfectWeights.difference, 0);

// 6.2 100% 미달인 경우 (80%)
const deficientWeights = validateMboObjectiveWeights([
  { weight: 50, title: '매출 성장' },
  { weight: 30, title: '고객 유지' },
]);
assert.equal(deficientWeights.valid, false);
assert.equal(deficientWeights.totalWeight, 80);
assert.equal(deficientWeights.difference, 20);
assert.match(deficientWeights.message, /20% 추가 필요/);

// 6.3 100% 초과인 경우 (115%)
const excessiveWeights = validateMboObjectiveWeights([
  { weight: 60, title: '매출 성장' },
  { weight: 40, title: '고객 유지' },
  { weight: 15, title: '팀 빌딩' },
]);
assert.equal(excessiveWeights.valid, false);
assert.equal(excessiveWeights.totalWeight, 115);
assert.equal(excessiveWeights.difference, -15);
assert.match(excessiveWeights.message, /15% 초과/);
console.log('  -> 개인별 목표 가중치 합계 100% 인터락 검증 성공');

console.log('=== [7] Multi-Stage MBO Evaluation Scoring (Self 20% / Manager 50% / Exec 30%) ===');

// 7.1 표준 가중치 종합 점수 산출
const multiEval = calculateMultiStageMboEvaluationScore({
  selfScore: 90,    // 90 * 0.20 = 18.0
  managerScore: 80, // 80 * 0.50 = 40.0
  executiveScore: 85, // 85 * 0.30 = 25.5
  // total = 18 + 40 + 25.5 = 83.5 => round 84 ('A')
});
assert.equal(multiEval.totalScore, 84);
assert.equal(multiEval.grade, 'A');
assert.equal(multiEval.isFullyCompleted, true);
assert.equal(multiEval.breakdown.self.weightedScore, 18);
assert.equal(multiEval.breakdown.manager.weightedScore, 40);
assert.equal(multiEval.breakdown.executive.weightedScore, 25.5);

// 7.2 임원 평가 미완료 상태 산출
const partialEval = calculateMultiStageMboEvaluationScore({
  selfScore: 95,
  managerScore: 90,
  executiveScore: null,
});
assert.equal(partialEval.isFullyCompleted, false);
assert.equal(partialEval.totalScore, 64); // 19 + 45 + 0 = 64 ('C')
console.log('  -> 3단계 다면평가 가중합산 종합 점수 산출 검증 성공');

console.log('=== [8] Grade Distribution Compliance (S 10% / A 20% / B 60% / CD 10%) ===');

// 8.1 정상 정규분포 준수 샘플 (총 10명: S 1명(10%), A 2명(20%), B 6명(60%), C 1명(10%))
const compliantGrades = [
  'S' as const,
  'A' as const, 'A' as const,
  'B' as const, 'B' as const, 'B' as const, 'B' as const, 'B' as const, 'B' as const,
  'C' as const,
];
const complianceResult = evaluateMboDistributionCompliance(compliantGrades);
assert.equal(complianceResult.isCompliant, true);
assert.equal(complianceResult.warnings.length, 0);
assert.equal(complianceResult.percentages.S, 10);
assert.equal(complianceResult.percentages.A, 20);
assert.equal(complianceResult.percentages.B, 60);

// 8.2 S등급 과다 (총 10명 중 S 2명(20%))
const excessSGrades = [
  'S' as const, 'S' as const,
  'A' as const,
  'B' as const, 'B' as const, 'B' as const, 'B' as const, 'B' as const,
  'C' as const, 'D' as const,
];
const excessResult = evaluateMboDistributionCompliance(excessSGrades);
assert.equal(excessResult.isCompliant, false);
assert.equal(excessResult.warnings.some((w) => w.includes('S등급 배분 비율(20%)이 권장 상한선(10%)을 초과')), true);
console.log('  -> 상대평가 정규분포 가이드라인 및 준수율 판정 검증 성공');

console.log('\n[PASS] mboEngine.test.ts: 모든 도메인 불변식 검증 완료');
