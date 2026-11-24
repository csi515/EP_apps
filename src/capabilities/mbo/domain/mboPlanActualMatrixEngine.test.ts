import assert from 'node:assert/strict';
import {
  buildPlanActualMatrixRows,
  filterMatrixProjects,
  isMonthCellContentEmpty,
  planMonthCellEnsure,
  type MatrixProjectInput,
  type MboProjectMonthCellModel,
} from './mboPlanActualMatrixEngine';

assert.equal(
  isMonthCellContentEmpty({
    planText: null,
    actualText: null,
    planStatus: 'normal',
    actualStatus: 'normal',
  }),
  true,
);
assert.equal(
  isMonthCellContentEmpty({
    planText: 'kickoff',
    actualText: null,
    planStatus: 'normal',
    actualStatus: 'normal',
  }),
  false,
);
assert.equal(
  isMonthCellContentEmpty({
    planText: null,
    actualText: null,
    planStatus: 'highlighted',
    actualStatus: 'normal',
  }),
  false,
);

const ensure = planMonthCellEnsure('2026-01-01', '2026-03-31', [
  {
    id: 'c1',
    year: 2026,
    month: 1,
    planText: null,
    planStatus: 'normal',
    actualText: null,
    actualStatus: 'normal',
  },
  {
    id: 'c4',
    year: 2026,
    month: 4,
    planText: null,
    planStatus: 'normal',
    actualText: null,
    actualStatus: 'normal',
  },
  {
    id: 'c5',
    year: 2026,
    month: 5,
    planText: 'keep',
    planStatus: 'normal',
    actualText: null,
    actualStatus: 'normal',
  },
]);
assert.deepEqual(
  ensure.toCreate.map((x) => `${x.year}-${x.month}`).sort(),
  ['2026-2', '2026-3'],
);
assert.deepEqual(ensure.toDeleteIds, ['c4']);

const projects: MatrixProjectInput[] = [
  {
    id: 'p2',
    title: 'B 과제',
    ownerId: 'u2',
    ownerName: '김이',
    categoryId: 'cat1',
    categoryLabel: '품질',
    wbsCode: '1-2',
    wbsSeq: 2,
    startDate: '2026-02-01',
    targetDate: '2026-04-30',
  },
  {
    id: 'p1',
    title: 'A 과제',
    ownerId: 'u1',
    ownerName: '홍길',
    categoryId: 'cat1',
    categoryLabel: '품질',
    wbsCode: '1-1',
    wbsSeq: 1,
    startDate: '2026-01-01',
    targetDate: '2026-03-31',
  },
];

const cells: MboProjectMonthCellModel[] = [
  {
    id: 'x1',
    projectId: 'p1',
    year: 2026,
    month: 2,
    planText: 'plan',
    planStatus: 'changed_or_delayed',
    actualText: null,
    actualStatus: 'normal',
  },
];

const filtered = filterMatrixProjects(projects, cells, { issuesOnly: true });
assert.deepEqual(
  filtered.map((p) => p.id),
  ['p1'],
);

const dual = buildPlanActualMatrixRows(projects, cells, 2026);
assert.equal(dual.length, 4);
assert.equal(dual[0].projectId, 'p1');
assert.equal(dual[0].kind, 'plan');
assert.equal(dual[0].showCategoryLabel, true);
assert.equal(dual[1].kind, 'actual');
assert.equal(dual[1].showCategoryLabel, false);
assert.equal(dual[0].editableMonths.has(1), true);
assert.equal(dual[0].editableMonths.has(4), false);
assert.equal(dual[2].projectId, 'p2');
assert.equal(dual[2].showCategoryLabel, false);
assert.equal(dual[2].showWbsLabel, true);

const actualOnly = buildPlanActualMatrixRows(projects, cells, 2026, { hidePlanRows: true });
assert.equal(actualOnly.length, 2);
assert.equal(actualOnly[0].kind, 'actual');
assert.equal(actualOnly[0].showCategoryLabel, true);

console.log('mboPlanActualMatrixEngine.test.ts: ok');