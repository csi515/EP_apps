/**
 * 실행: npx tsx src/capabilities/mbo/domain/mboGoalHierarchy.test.ts
 */
import assert from 'node:assert/strict';
import {
  hasPrerequisiteGoals,
  isTopExecutiveRole,
  listCreatableLevels,
  listEligibleParentGoals,
  resolveMaxCreatableLevel,
  validateGoalCreation,
  type ExistingGoalRef,
  type GoalHierarchyActor,
} from './mboGoalHierarchy';

assert.equal(isTopExecutiveRole({ memberRole: 'owner' }), true);
assert.equal(isTopExecutiveRole({ roleName: '대표이사', rankOrder: 100 }), true);
assert.equal(isTopExecutiveRole({ roleName: '과장', rankOrder: 400 }), false);
assert.equal(isTopExecutiveRole({ rankOrder: 100 }), true);
assert.equal(isTopExecutiveRole({ rankOrder: 200 }), false);

const ceo: GoalHierarchyActor = {
  isTopExecutive: true,
  isUnitLeader: false,
  ledDepartmentIds: [],
  rankOrder: 100,
  roleName: '대표이사',
};
const groupLead: GoalHierarchyActor = {
  isTopExecutive: false,
  isUnitLeader: true,
  ledDepartmentIds: ['dept-group-a'],
  rankOrder: 400,
  roleName: '과장',
};
const staff: GoalHierarchyActor = {
  isTopExecutive: false,
  isUnitLeader: false,
  ledDepartmentIds: [],
  rankOrder: 900,
  roleName: '사원',
};

assert.equal(resolveMaxCreatableLevel(ceo), 'company');
assert.equal(resolveMaxCreatableLevel(groupLead), 'department');
assert.equal(resolveMaxCreatableLevel(staff), 'individual');
assert.deepEqual(listCreatableLevels(groupLead), ['department', 'individual']);
assert.deepEqual(listCreatableLevels(staff), ['individual']);

const empty: ExistingGoalRef[] = [];
assert.equal(hasPrerequisiteGoals('company', empty), true);
assert.equal(hasPrerequisiteGoals('department', empty), false);
assert.equal(hasPrerequisiteGoals('individual', empty), false);

const companyOnly: ExistingGoalRef[] = [
  { id: 'c1', level: 'company', parentId: null },
];
assert.equal(hasPrerequisiteGoals('department', companyOnly), true);
assert.equal(hasPrerequisiteGoals('individual', companyOnly), true);

// 그룹장이 전사 목표를 쓰려 하면 거부
const denyCompany = validateGoalCreation({
  actor: groupLead,
  request: { level: 'company', parentId: null },
  existing: empty,
});
assert.equal(denyCompany.allowed, false);
assert.match(String(denyCompany.reason), /상급/);

// 상위 목표 없이 그룹 목표 거부
const denyNoParentCompany = validateGoalCreation({
  actor: groupLead,
  request: { level: 'department', parentId: null, departmentId: 'dept-group-a' },
  existing: empty,
});
assert.equal(denyNoParentCompany.allowed, false);
assert.match(String(denyNoParentCompany.reason), /전사/);

// 자기 그룹 + 전사 부모 → 허용
const okGroup = validateGoalCreation({
  actor: groupLead,
  request: {
    level: 'department',
    parentId: 'c1',
    departmentId: 'dept-group-a',
  },
  existing: companyOnly,
});
assert.equal(okGroup.allowed, true);

// 다른 그룹 목표 거부
const denyOtherGroup = validateGoalCreation({
  actor: groupLead,
  request: {
    level: 'department',
    parentId: 'c1',
    departmentId: 'dept-other',
  },
  existing: companyOnly,
});
assert.equal(denyOtherGroup.allowed, false);
assert.match(String(denyOtherGroup.reason), /리더로 맡은/);

// 개인 KPI는 상위 목표 부모 필수
const denyIndNoParent = validateGoalCreation({
  actor: staff,
  request: { level: 'individual', parentId: null },
  existing: companyOnly,
});
assert.equal(denyIndNoParent.allowed, false);

const withDept: ExistingGoalRef[] = [
  ...companyOnly,
  { id: 'd1', level: 'department', parentId: 'c1', departmentId: 'dept-group-a' },
];
const okInd = validateGoalCreation({
  actor: staff,
  request: { level: 'individual', parentId: 'd1' },
  existing: withDept,
});
assert.equal(okInd.allowed, true);

// 부모 단계가 같거나 낮으면 거부
const denyPeerParent = validateGoalCreation({
  actor: staff,
  request: { level: 'individual', parentId: 'i0' },
  existing: [
    ...withDept,
    { id: 'i0', level: 'individual', parentId: 'd1' },
  ],
});
assert.equal(denyPeerParent.allowed, false);

const parents = listEligibleParentGoals('individual', withDept);
assert.equal(parents.length, 2);
assert.ok(parents.every((p) => p.level === 'company' || p.level === 'department'));

console.log('mboGoalHierarchy.test.ts: ok');
