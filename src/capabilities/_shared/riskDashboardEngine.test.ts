import assert from 'node:assert/strict';
import {
  calculateExecutiveRiskScore,
  type DepartmentRiskFactors,
} from './riskDashboardEngine';

function testRiskScoreCalculation(): void {
  // 1. 이상 없는 정상 상태 (모든 팩터 0)
  const fNormal: DepartmentRiskFactors = {
    incidentCount: 0,
    criticalIncidentCount: 0,
    vocComplaintCount: 0,
    npsDetractorRatio: 0,
    unpaidInvoiceCount: 0,
    overdueInvoiceRatio: 0,
  };
  const rNormal = calculateExecutiveRiskScore(fNormal);
  assert.equal(rNormal.riskScore, 0);
  assert.equal(rNormal.grade, 'normal');
  assert.equal(rNormal.breakdown.safetyScore, 0);
  assert.match(rNormal.keyActionItems[0]!, /안정 범위/);

  // 2. 중대 안전사고 발생 시 즉시 Critical 등급 부여
  const fCritical: DepartmentRiskFactors = {
    incidentCount: 1,
    criticalIncidentCount: 1,
    vocComplaintCount: 1,
    npsDetractorRatio: 0.1,
    unpaidInvoiceCount: 1,
    overdueInvoiceRatio: 0.05,
  };
  const rCritical = calculateExecutiveRiskScore(fCritical);
  assert.equal(rCritical.grade, 'critical');
  assert.ok(rCritical.riskScore >= 20);
  assert.match(rCritical.keyActionItems[0]!, /중대 안전사고/);

  // 3. 복합 위험 (경고 등급)
  const fWarning: DepartmentRiskFactors = {
    incidentCount: 3,
    criticalIncidentCount: 0,
    vocComplaintCount: 4,
    npsDetractorRatio: 0.4,
    unpaidInvoiceCount: 5,
    overdueInvoiceRatio: 0.25,
  };
  const rWarning = calculateExecutiveRiskScore(fWarning);
  assert.ok(rWarning.riskScore >= 50);
  assert.equal(rWarning.grade, 'warning');
  assert.equal(rWarning.keyActionItems.length >= 3, true);

  console.log('riskDashboardEngine.test.ts: ok');
}

testRiskScoreCalculation();
