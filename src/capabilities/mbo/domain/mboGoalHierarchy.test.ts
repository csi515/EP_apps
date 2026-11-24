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
// 개인 KPI는 조직단위 목표 선행 필수 (회사만으로는 불가)
assert.equal(hasPrerequisiteGoals('individual', companyOnly), false);

// 그룹장이 전사 목표를 쓰려 하면 거부
const denyCompany = validateGoalCreation({
  actor: groupLead,
  request: { level: 'company', parentId: null },
  existing: empty,
});
assert.equal(denyCompany.allowed, false);
assert.match(String(denyCompany.reason), /상급/);

// 연관 상위 없음(null)이어도 조직단위 목표 등록 허용
const okDeptNoParent = validateGoalCreation({
  actor: groupLead,
  request: { level: 'department', parentId: null, departmentId: 'dept-group-a' },
  existing: empty,
});
assert.equal(okDeptNoParent.allowed, true);

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

// 대표이사도 조직단위 목표에 departmentId 필수
const denyCeoNoDept = validateGoalCreation({
  actor: ceo,
  request: { level: 'department', parentId: 'c1' },
  existing: companyOnly,
});
assert.equal(denyCeoNoDept.allowed, false);
assert.match(String(denyCeoNoDept.reason), /조직/);

const okCeoDept = validateGoalCreation({
  actor: ceo,
  request: {
    level: 'department',
    parentId: 'c1',
    departmentId: 'dept-any',
  },
  existing: companyOnly,
});
assert.equal(okCeoDept.allowed, true);

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

// 개인 KPI — 연관 상위 없음(null) 허용
const okIndNoParent = validateGoalCreation({
  actor: staff,
  request: { level: 'individual', parentId: null },
  existing: companyOnly,
});
assert.equal(okIndNoParent.allowed, true);

// 개인 KPI를 전사 목표에 직결하면 거부
const denyIndUnderCompanyOnly = validateGoalCreation({
  actor: staff,
  request: { level: 'individual', parentId: 'c1' },
  existing: companyOnly,
});
assert.equal(denyIndUnderCompanyOnly.allowed, false);

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

// 개인 → 회사 직결 거부
const denyIndUnderCompany = validateGoalCreation({
  actor: staff,
  request: { level: 'individual', parentId: 'c1' },
  existing: withDept,
});
assert.equal(denyIndUnderCompany.allowed, false);
assert.match(String(denyIndUnderCompany.reason), /조직단위/);

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

const parentsInd = listEligibleParentGoals('individual', withDept);
assert.equal(parentsInd.length, 1);
assert.ok(parentsInd.every((p) => p.level === 'department'));

const parentsDept = listEligibleParentGoals('department', withDept);
assert.equal(parentsDept.length, 1);
assert.ok(parentsDept.every((p) => p.level === 'company'));

console.log('mboGoalHierarchy.test.ts: ok');
