import assert from 'node:assert';
import {
  calculateRiskLevel,
  evaluateRiskReduction,
  calculateSafetyAuditSummary,
  evaluateEnvironmentalAspect,
  HazardRiskItem,
} from './sopRiskAssessmentEngine';

console.log('--- Testing sopRiskAssessmentEngine ---');

// Test 1: 5x5 Risk matrix calculation
const lowRisk = calculateRiskLevel(2, 2); // 4 -> low
assert.strictEqual(lowRisk.score, 4);
assert.strictEqual(lowRisk.level, 'low');
assert.strictEqual(lowRisk.requiresImmediateAction, false);

const mediumRisk = calculateRiskLevel(3, 3); // 9 -> medium
assert.strictEqual(mediumRisk.score, 9);
assert.strictEqual(mediumRisk.level, 'medium');

const highRisk = calculateRiskLevel(3, 4); // 12 -> high
assert.strictEqual(highRisk.score, 12);
assert.strictEqual(highRisk.level, 'high');
assert.strictEqual(highRisk.requiresImmediateAction, true);

const criticalRisk = calculateRiskLevel(4, 5); // 20 -> critical
assert.strictEqual(criticalRisk.score, 20);
assert.strictEqual(criticalRisk.level, 'critical');
assert.strictEqual(criticalRisk.requiresImmediateAction, true);
console.log('✅ Test 1 passed: 5x5 Risk level tiers and scoring');

// Test 2: Risk reduction evaluation
const reduction = evaluateRiskReduction(20, 6);
assert.strictEqual(reduction.reductionPercent, 70); // (20-6)/20 = 70%
assert.strictEqual(reduction.isAcceptable, true); // 6 <= 9 is acceptable

const insufficientReduction = evaluateRiskReduction(20, 12);
assert.strictEqual(insufficientReduction.reductionPercent, 40);
assert.strictEqual(insufficientReduction.isAcceptable, false); // 12 > 9 is still high
console.log('✅ Test 2 passed: Risk reduction percentage and acceptability');

// Test 3: Workplace audit summary
const testHazards: HazardRiskItem[] = [
  {
    hazardId: 'h-1',
    processName: '차량 리프트 하부 점검',
    hazardCategory: 'mechanical',
    hazardDescription: '리프트 유압 호스 파손으로 인한 급격한 차량 낙하',
    currentFrequency: 4,
    currentSeverity: 5,
    currentRiskScore: 20,
    currentRiskLevel: 'critical',
    controlMeasure: '기계식 이중 안전 멈춤 쇄 및 일일 유압 밸브 점검',
    controlType: 'engineering',
    residualFrequency: 1,
    residualSeverity: 4,
    residualRiskScore: 4,
    residualRiskLevel: 'low',
    isImplemented: true, // 개선 완료
    actionDeadline: '2026-10-31',
    inspectorName: '김정비 안전관리자',
  },
  {
    hazardId: 'h-2',
    processName: '수영장 기계실 약품 투입',
    hazardCategory: 'chemical',
    hazardDescription: '염소 가스 누출 및 호흡기 흡입',
    currentFrequency: 2,
    currentSeverity: 4,
    currentRiskScore: 8,
    currentRiskLevel: 'medium',
    controlMeasure: '송기 마스크 비치 및 강제 배기 닥트 상시 가동',
    controlType: 'engineering',
    residualFrequency: 1,
    residualSeverity: 2,
    residualRiskScore: 2,
    residualRiskLevel: 'low',
    isImplemented: true,
    actionDeadline: '2026-11-15',
    inspectorName: '박안전 기사',
  },
];

const audit1 = calculateSafetyAuditSummary(testHazards);
assert.strictEqual(audit1.totalHazards, 2);
assert.strictEqual(audit1.criticalHazards, 1);
assert.strictEqual(audit1.complianceRatePercent, 100);
assert.strictEqual(audit1.isLegalAuditReady, true); // critical implemented & 100% rate
console.log('✅ Test 3 passed: Safety audit summary with full compliance');

// Test 4: Audit unready when critical hazard is pending
const unreadyHazards: HazardRiskItem[] = [
  ...testHazards,
  {
    hazardId: 'h-3',
    processName: '주방 고온 튀김기 정제 작업',
    hazardCategory: 'chemical',
    hazardDescription: '180도 고온 기름 비산으로 인한 전신 화상',
    currentFrequency: 4,
    currentSeverity: 4,
    currentRiskScore: 16,
    currentRiskLevel: 'critical',
    controlMeasure: '내열 방열복 및 안면보호구 착용 의무화',
    controlType: 'ppe',
    residualFrequency: 2,
    residualSeverity: 2,
    residualRiskScore: 4,
    residualRiskLevel: 'low',
    isImplemented: false, // 미이행!
    actionDeadline: '2026-10-20',
    inspectorName: '최주방 조리장',
  },
];

const audit2 = calculateSafetyAuditSummary(unreadyHazards);
assert.strictEqual(audit2.isLegalAuditReady, false); // unaddressed critical hazard exists
assert.strictEqual(audit2.complianceRatePercent, 67); // 2 out of 3
// Test 5: ISO 14001 Environmental aspect evaluation and ISO 45001 elimination control
const env1 = evaluateEnvironmentalAspect({
  aspectCategory: 'waste',
  frequency: 4,
  severity: 4,
  legalRegulated: true, // 폐기물관리법 규제 대상
});
assert.strictEqual(env1.score, 16);
assert.strictEqual(env1.isSignificantAspect, true);
assert.ok(env1.managementRequirement.includes('중대 환경측면'));

const env2 = evaluateEnvironmentalAspect({
  aspectCategory: 'energy',
  frequency: 2,
  severity: 2,
  legalRegulated: false,
});
assert.strictEqual(env2.score, 4);
assert.strictEqual(env2.isSignificantAspect, false);
assert.ok(env2.managementRequirement.includes('일반 환경측면'));
console.log('✅ Test 5 passed: ISO 14001 Environmental aspect evaluation');

// Test 6: 연구실안전법 일일 안전점검 및 법정 안전교육(반기 6시간) 이수율
const { evaluateLabSafetyInspection, calculateLabSafetyTrainingCompliance } = await import('./sopRiskAssessmentEngine');

// 6-1) 연구실 일일 안전점검 결함 감지 및 조치사항 도출
const failedInspection = evaluateLabSafetyInspection({
  labName: '제1합성연구실',
  inspectionDate: '2026-10-18',
  inspectorName: '김연구',
  emergencyShowerWorking: false, // 결함!
  gasDetectorWorking: true,
  fireExtinguisherValid: true,
  fumeHoodVelocityOk: false, // 결함!
  chemicalStorageOrganized: true,
});
assert.strictEqual(failedInspection.isAllPassed, false);
assert.strictEqual(failedInspection.correctiveActions.length, 2);
assert.ok(failedInspection.correctiveActions[0].includes('비상 샤워기'));
assert.ok(failedInspection.correctiveActions[1].includes('흄후드'));

// 전 항목 합격 케이스
const passedInspection = evaluateLabSafetyInspection({
  labName: '정밀분석기기실',
  inspectionDate: '2026-10-18',
  inspectorName: '김연구',
  emergencyShowerWorking: true,
  gasDetectorWorking: true,
  fireExtinguisherValid: true,
  fumeHoodVelocityOk: true,
  chemicalStorageOrganized: true,
});
assert.strictEqual(passedInspection.isAllPassed, true);
assert.strictEqual(passedInspection.correctiveActions.length, 0);

// 6-2) 법정 안전교육 이수율 계산 (3명 중 2명 6시간 이수 = 66.7%)
const trainingRecords = [
  { researcherId: 'r1', researcherName: 'A', department: 'Lab1', halfYearPeriod: '2026-H2', requiredHours: 6, completedHours: 6, isFullyCompliant: true },
  { researcherId: 'r2', researcherName: 'B', department: 'Lab1', halfYearPeriod: '2026-H2', requiredHours: 6, completedHours: 8, isFullyCompliant: true },
  { researcherId: 'r3', researcherName: 'C', department: 'Lab1', halfYearPeriod: '2026-H2', requiredHours: 6, completedHours: 4, isFullyCompliant: false },
];
const compliance = calculateLabSafetyTrainingCompliance(trainingRecords);
assert.strictEqual(compliance.totalResearchers, 3);
assert.strictEqual(compliance.compliantCount, 2);
assert.strictEqual(compliance.nonCompliantCount, 1);
assert.strictEqual(compliance.overallComplianceRatePercent, 66.7);
assert.strictEqual(compliance.isFullyLegalCompliant, false);
console.log('✅ Test 6 passed: Lab Safety inspection and statutory training compliance');

console.log('🎉 All sopRiskAssessmentEngine tests passed!');

