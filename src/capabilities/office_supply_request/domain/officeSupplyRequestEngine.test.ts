/**
 * 실행: npx tsx src/capabilities/office_supply_request/domain/officeSupplyRequestEngine.test.ts
 */
import assert from 'node:assert/strict';
import {
  aggregateByDepartment,
  aggregateByItem,
  campaignLockReason,
  canManageOfficeSupplyRequest,
  formatAggregateCsv,
  isCampaignWritable,
  isValidYearMonth,
  normalizeRequestLines,
  shiftYearMonth,
  toYearMonth,
  validateRequestLines,
} from './officeSupplyRequestEngine';

assert.equal(canManageOfficeSupplyRequest({ role: 'owner' }), true);
assert.equal(canManageOfficeSupplyRequest({ role: 'admin' }), true);
assert.equal(
  canManageOfficeSupplyRequest({
    role: 'staff',
    permissions: { 'office_supply_request:manage': true },
  }),
  true
);
assert.equal(
  canManageOfficeSupplyRequest({
    role: 'staff',
    permissions: { 'meal_survey:manage': true },
  }),
  false
);

assert.ok(isValidYearMonth('2026-10'));
assert.equal(isValidYearMonth('2026-13'), false);
assert.equal(shiftYearMonth('2026-12', 1), '2027-01');
assert.equal(toYearMonth(new Date(2026, 9, 15)), '2026-10');

const openCampaign = {
  status: 'open' as const,
  deadlineAt: new Date(Date.now() + 60_000).toISOString(),
};
const pastCampaign = {
  status: 'open' as const,
  deadlineAt: new Date(Date.now() - 60_000).toISOString(),
};
const closedCampaign = {
  status: 'closed' as const,
  deadlineAt: new Date(Date.now() + 60_000).toISOString(),
};

assert.equal(isCampaignWritable(openCampaign), true);
assert.equal(isCampaignWritable(pastCampaign), false);
assert.equal(isCampaignWritable(closedCampaign), false);
assert.equal(campaignLockReason(closedCampaign), '관리자가 마감했습니다.');
assert.equal(campaignLockReason(pastCampaign), '신청 마감일이 지났습니다.');
assert.equal(campaignLockReason(openCampaign), null);

const catalog = new Set(['a', 'b']);
assert.equal(validateRequestLines([{ catalogItemId: 'a', quantity: 2 }], catalog).isValid, true);
assert.equal(validateRequestLines([{ catalogItemId: 'x', quantity: 1 }], catalog).isValid, false);
assert.equal(validateRequestLines([{ catalogItemId: 'a', quantity: 0 }], catalog).isValid, false);

assert.deepEqual(normalizeRequestLines({ a: 2, b: 0, c: -1 }), [
  { catalogItemId: 'a', quantity: 2 },
]);

const deptRows = aggregateByDepartment([
  {
    departmentId: 'd1',
    departmentName: '총무',
    catalogItemId: 'a',
    itemName: '볼펜',
    unit: '자루',
    estimatedUnitPrice: 500,
    quantity: 3,
  },
  {
    departmentId: 'd1',
    departmentName: '총무',
    catalogItemId: 'a',
    itemName: '볼펜',
    unit: '자루',
    estimatedUnitPrice: 500,
    quantity: 2,
  },
  {
    departmentId: null,
    departmentName: null,
    catalogItemId: 'b',
    itemName: 'A4',
    unit: '박스',
    estimatedUnitPrice: 20000,
    quantity: 1,
  },
]);
assert.equal(deptRows.length, 2);
const pen = deptRows.find((r) => r.catalogItemId === 'a');
assert.ok(pen);
assert.equal(pen.totalQuantity, 5);
assert.equal(pen.estimatedTotal, 2500);

const byItem = aggregateByItem(deptRows);
assert.equal(byItem.length, 2);
const csv = formatAggregateCsv(deptRows, byItem);
assert.ok(csv.includes('부서별'));
assert.ok(csv.includes('품목합계'));
assert.ok(csv.includes('총계'));

console.log('officeSupplyRequestEngine.test.ts: ok');
