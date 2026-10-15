import assert from 'node:assert';
import {
  evaluateRepairVsReplaceDecision,
  evaluateEquipmentUrgency,
  reportEquipmentBreakdown,
  calculateMonthlyDepreciationReport,
  createDepreciationLedgerEntryPayload,
  EquipmentAsset,
} from './equipmentLifecycleEngine';

console.log('--- Testing equipmentLifecycleEngine ---');

// Test 1: Straight-line depreciation and repair vs replace recommendation
const pilatesReformer: EquipmentAsset = {
  id: 'eq_1',
  name: '캐딜락 리포머 1호',
  category: 'fitness',
  purchaseCost: 6000000,
  usefulLifeMonths: 60, // 5 years
  installedDate: '2024-10-14T00:00:00Z', // 24 months elapsed
  lastMaintenanceDate: '2026-08-14T00:00:00Z',
  maintenanceIntervalMonths: 6,
  cumulativeRepairCost: 1200000, // 20% of cost
  status: 'good',
};

const decision1 = evaluateRepairVsReplaceDecision(pilatesReformer, '2026-10-14T00:00:00Z');
assert.strictEqual(decision1.depreciationMonthsElapsed, 24);
assert.strictEqual(decision1.repairCostRatioPercent, 20);
assert.strictEqual(decision1.recommendation, 'maintain_repair');
console.log('✅ Test 1 passed: Depreciation and maintain recommendation');

// Test 2: Heavy repair costs leading to replacement recommendation
const oldEspressoMachine: EquipmentAsset = {
  id: 'eq_2',
  name: '에스프레소 머신',
  category: 'cafe',
  purchaseCost: 10000000,
  usefulLifeMonths: 48,
  installedDate: '2022-01-01T00:00:00Z',
  lastMaintenanceDate: '2025-01-01T00:00:00Z',
  maintenanceIntervalMonths: 3,
  cumulativeRepairCost: 5500000, // 55% of cost
  status: 'good',
};

const decision2 = evaluateRepairVsReplaceDecision(oldEspressoMachine, '2026-10-14T00:00:00Z');
assert.strictEqual(decision2.repairCostRatioPercent, 55);
assert.strictEqual(decision2.recommendation, 'recommend_replacement');
console.log('✅ Test 2 passed: High repair cost triggers replacement recommendation');

// Test 3: Maintenance urgency check and breakdown reporting
const urgencyDue = evaluateEquipmentUrgency(oldEspressoMachine, '2026-10-14T00:00:00Z');
assert.strictEqual(urgencyDue, 'overdue');

const reported = reportEquipmentBreakdown(pilatesReformer, '리포머 3번 스프링 파손 위험');
assert.strictEqual(reported.status, 'breakdown');
assert.strictEqual(reported.breakdownNotes, '리포머 3번 스프링 파손 위험');
console.log('✅ Test 3 passed: Overdue maintenance detection and breakdown reporting');

// Test 4: 월별 감가상각비 집계 및 간이 손익계산서(ledger_simple) 분개 전표 생성
const assets = [pilatesReformer, oldEspressoMachine];
const depReport = calculateMonthlyDepreciationReport(assets, '2026-10');

// 리포머: (6,000,000 - 600,000) / 60개월 = 월 90,000원 (상각 진행 중)
// 에스프레소 머신: 2022-01 설치, 내용연수 48개월 -> 2026-01 만료로 상각 완료 (0원)
assert.strictEqual(depReport.periodYearMonth, '2026-10');
assert.strictEqual(depReport.activeAssetsCount, 1);
assert.strictEqual(depReport.totalDepreciationExpense, 90000);

const reformerItem = depReport.items.find((it) => it.assetId === 'eq_1')!;
assert.strictEqual(reformerItem.monthlyDepreciation, 90000);
assert.strictEqual(reformerItem.isFullyDepreciated, false);

const espressoItem = depReport.items.find((it) => it.assetId === 'eq_2')!;
assert.strictEqual(espressoItem.monthlyDepreciation, 0);
assert.strictEqual(espressoItem.isFullyDepreciated, true);

// 손익 분개 전표 페이로드 검증
const ledgerPayload = createDepreciationLedgerEntryPayload(depReport);
assert.strictEqual(ledgerPayload.type, 'EXPENSE');
assert.strictEqual(ledgerPayload.method, 'OTHER');
assert.strictEqual(ledgerPayload.amount, 90000);
assert.ok(ledgerPayload.description.includes('고정자산 감가상각'));
assert.strictEqual(ledgerPayload.timestamp, '2026-10-31T23:59:59.000Z');
console.log('✅ Test 4 passed: Monthly depreciation reporting and ledger expense payload creation');

console.log('🎉 All equipmentLifecycleEngine tests passed!');
