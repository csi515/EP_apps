/**
 * 실행: npx tsx src/capabilities/sop_risk_assessment/domain/sopDepartmentFilter.test.ts
 */
import assert from 'node:assert/strict';
import {
  countAssessmentsByDepartment,
  deriveDepartmentCode,
  filterAssessmentsByDepartment,
  resolveAssessmentDepartmentId,
} from './sopDepartmentFilter';

assert.equal(deriveDepartmentCode({ code: 'mnt', name: '정비' }), 'MNT');
assert.equal(deriveDepartmentCode({ code: null, name: 'QA', id: 'x' }), 'QA');

const departments = [
  { id: 'd1', name: '정비보전팀', code: 'MNT' },
  { id: 'd2', name: '생산1팀', code: 'PRD1' },
];

const docs = [
  {
    id: 'a',
    department_id: 'd1',
    snapshot_payload: { deptCode: 'MNT', deptName: '정비보전팀', steps: [], prohibitedActions: [] },
  },
  {
    id: 'b',
    department_id: null,
    snapshot_payload: { deptCode: 'PRD1', deptName: '생산1팀', steps: [], prohibitedActions: [] },
  },
  {
    id: 'c',
    department_id: null,
    snapshot_payload: { deptCode: 'OLD', deptName: '폐지부서', steps: [], prohibitedActions: [] },
  },
];

assert.equal(resolveAssessmentDepartmentId(docs[0], departments), 'd1');
assert.equal(resolveAssessmentDepartmentId(docs[1], departments), 'd2');
assert.equal(resolveAssessmentDepartmentId(docs[2], departments), null);

assert.deepEqual(
  filterAssessmentsByDepartment(docs, departments, 'd1').map((d) => d.id),
  ['a']
);
assert.deepEqual(
  filterAssessmentsByDepartment(docs, departments, 'd2').map((d) => d.id),
  ['b']
);
assert.deepEqual(
  filterAssessmentsByDepartment(docs, departments, 'unassigned').map((d) => d.id),
  ['c']
);
assert.equal(filterAssessmentsByDepartment(docs, departments, 'all').length, 3);

const counts = countAssessmentsByDepartment(docs, departments);
assert.equal(counts.all, 3);
assert.equal(counts.unassigned, 1);
assert.equal(counts.byId.d1, 1);
assert.equal(counts.byId.d2, 1);

console.log('sopDepartmentFilter.test.ts: ok');
