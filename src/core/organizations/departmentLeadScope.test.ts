/**
 * 실행: npx tsx src/core/organizations/departmentLeadScope.test.ts
 */
import assert from 'node:assert/strict';
import {
  isSubtreeLeaderOfUser,
  resolveLeaderDepartmentPaths,
  resolveManagedMemberIds,
} from './departmentLeadScope';

const assignments = [
  {
    memberId: 'lead-1',
    departmentId: 'dept-group',
    scopeType: 'DESCENDANTS' as const,
    departmentPath: '/root/group/',
  },
  {
    memberId: 'peer-lead',
    departmentId: 'dept-other',
    scopeType: 'DESCENDANTS' as const,
    departmentPath: '/root/other/',
  },
];

const memberships = [
  {
    memberId: 'lead-1',
    departmentId: 'dept-group',
    departmentPath: '/root/group/',
    userId: 'user-lead',
  },
  {
    memberId: 'mem-a',
    departmentId: 'dept-team',
    departmentPath: '/root/group/team/',
    userId: 'user-a',
  },
  {
    memberId: 'mem-b',
    departmentId: 'dept-other-team',
    departmentPath: '/root/other/team/',
    userId: 'user-b',
  },
];

assert.deepEqual(resolveLeaderDepartmentPaths('lead-1', assignments), ['/root/group/']);

const managed = resolveManagedMemberIds('lead-1', assignments, memberships);
assert.equal(managed.has('mem-a'), true);
assert.equal(managed.has('lead-1'), true);
assert.equal(managed.has('mem-b'), false);

assert.equal(isSubtreeLeaderOfUser('lead-1', 'user-a', assignments, memberships), true);
assert.equal(isSubtreeLeaderOfUser('lead-1', 'user-b', assignments, memberships), false);
assert.equal(isSubtreeLeaderOfUser('mem-a', 'user-b', assignments, memberships), false);

console.log('departmentLeadScope.test.ts: ok');
