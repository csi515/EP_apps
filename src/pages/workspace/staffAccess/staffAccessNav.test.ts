/**
 * 실행: npx tsx src/pages/workspace/staffAccess/staffAccessNav.test.ts
 */
import assert from 'node:assert/strict';
import { buildStaffAccessPath, parseStaffAccessSearch } from './staffAccessNav';

assert.deepEqual(parseStaffAccessSearch(''), {
  appId: null,
  memberId: null,
  intent: null,
  mode: null,
});

assert.deepEqual(parseStaffAccessSearch('?app=mbo&member=abc&intent=grant&mode=admin'), {
  appId: 'mbo',
  memberId: 'abc',
  intent: 'grant',
  mode: 'admin',
});

assert.equal(parseStaffAccessSearch('?app=app_access').appId, null, 'self app not assignable');
assert.equal(parseStaffAccessSearch('?app=unknown').appId, null);

assert.equal(
  buildStaffAccessPath({ appId: 'mbo', memberId: 'u1', intent: 'grant', mode: 'admin' }),
  '/workspace/app-access?app=mbo&member=u1&intent=grant&mode=admin'
);
assert.equal(buildStaffAccessPath({}), '/workspace/app-access');

console.log('staffAccessNav.test.ts: ok');
