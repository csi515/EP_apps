/**
 * Business Health Diagnostic Engine Unit Tests.
 */

import assert from 'node:assert/strict';
import { evaluateBusinessHealth } from './businessHealthEngine';

function runHealthTests(): void {
  console.log('🧪 [Test Suite] Business Health Diagnostic Engine Invariants\n');

  // Test 1: 피트니스/학원형 진단 (우수 사례: 재등록률 80%, 미출석 적음)
  {
    console.log('  ▶ Test 1: 피트니스/학원형 건전성 진단 (우수)');
    const report = evaluateBusinessHealth('pilates', {
      totalCustomers: 100,
      activeCustomers: 85,
      expiringCustomersThisMonth: 10,
      reEnrolledCustomersThisMonth: 9, // 90% 재등록
      inactiveTwoWeeksCount: 1,
      uncollectedBillCount: 0,
    });

    assert.ok(report.overallScore >= 85, '우수한 지표는 85점 이상이어야 함');
    assert.equal(report.overallGrade, 'EXCELLENT');
    assert.equal(report.gradeColor, 'emerald');

    const retentionMetric = report.metrics.find((m) => m.id === 'retention_rate');
    assert.ok(retentionMetric, '재등록률 지표가 포함되어야 함');
    assert.equal(retentionMetric?.value, 90);
    assert.equal(retentionMetric?.status, 'good');
    console.log('    ✓ 통과');
  }

  // Test 2: 소매/식음료형 진단 (유통기한 임박 3건 감지 -> 주의/처방 발급)
  {
    console.log('  ▶ Test 2: 식음료/소매형 진단 - 유통기한 임박 및 안전재고 부족 처방');
    const report = evaluateBusinessHealth('retail', {
      totalCustomers: 200,
      activeCustomers: 120,
      inventoryExpiringLotsCount: 3, // 유통기한 임박 3건
      outOfStockItemsCount: 2, // 품절 2종
      uncollectedBillCount: 1,
    });

    const expiringMetric = report.metrics.find((m) => m.id === 'expiring_lots');
    assert.ok(expiringMetric);
    assert.equal(expiringMetric?.value, 3);
    assert.equal(expiringMetric?.status, 'danger');

    // 처방에 FEFO 조치가 포함되어야 함
    const fefoAction = report.prescriptions.find((p) => p.title.includes('FEFO'));
    assert.ok(fefoAction, 'FEFO 우선 소진 처방이 생성되어야 함');
    assert.equal(fefoAction?.actionTargetTab, 'inventory');
    console.log('    ✓ 통과');
  }

  // Test 3: 공간 대여형 진단 (공간 가동률 계산)
  {
    console.log('  ▶ Test 3: 공간 대여형 진단 - 공간 가동률');
    const report = evaluateBusinessHealth('study_cafe', {
      totalCustomers: 50,
      activeCustomers: 40,
      spaceUtilizationRate: 72,
    });

    const spaceMetric = report.metrics.find((m) => m.id === 'space_util');
    assert.ok(spaceMetric);
    assert.equal(spaceMetric?.value, 72);
    assert.equal(spaceMetric?.status, 'good');
    console.log('    ✓ 통과');
  }

  console.log('\n✨ All Business Health Diagnostic tests passed cleanly!\n');
}

runHealthTests();
