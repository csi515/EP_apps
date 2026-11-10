/**
 * 실행: npx tsx src/pages/workspace/staffAccess/staffAccessKpiEngine.test.ts
 */
import assert from 'node:assert/strict';
import { computeStaffAccessAppKpis } from './staffAccessKpiEngine';

const kpis = computeStaffAccessAppKpis(
  [
    { feature_permissions: { 'company_app:mbo': true }, is_active: true },
    { feature_permissions: { 'company_app:mbo': false }, is_active: true },
    { feature_permissions: {}, is_active: true },
    { feature_permissions: { 'company_app:mbo': true }, is_active: false },
  ],
  'mbo'
);

assert.equal(kpis.activeTotal, 3);
assert.equal(kpis.granted, 1);
assert.equal(kpis.denied, 1);
assert.equal(kpis.without, 1);

console.log('staffAccessKpiEngine.test.ts: ok');
