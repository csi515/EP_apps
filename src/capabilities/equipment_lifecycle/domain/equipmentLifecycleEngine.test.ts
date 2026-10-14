import assert from 'node:assert';
import {
  evaluateRepairVsReplaceDecision,
  evaluateEquipmentUrgency,
  reportEquipmentBreakdown,
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

console.log('🎉 All equipmentLifecycleEngine tests passed!');
