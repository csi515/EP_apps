import assert from 'node:assert/strict';
import {
  archiveCategory,
  defaultLabCategorySeeds,
  filterProjectsByCategories,
  listActiveCategories,
  restoreCategory,
  slugifyCategoryKey,
  validateCategoryDraft,
  type ProjectCategory,
} from './projectCategoryEngine';

console.log('--- Testing projectCategoryEngine ---');

const EXISTING: ProjectCategory[] = [
  {
    id: 'c1',
    organizationId: 'org-1',
    categoryKey: 'research',
    label: '연구',
    sortOrder: 10,
    isActive: true,
  },
  {
    id: 'c2',
    organizationId: 'org-1',
    categoryKey: 'quality',
    label: '품질',
    sortOrder: 20,
    isActive: true,
  },
  {
    id: 'c3',
    organizationId: 'org-1',
    categoryKey: 'old_tech',
    label: '구기술',
    sortOrder: 99,
    isActive: false,
    archivedAt: '2026-01-01T00:00:00.000Z',
  },
];

{
  assert.equal(slugifyCategoryKey('  R&D 연구  '), 'rd_연구');
  assert.equal(slugifyCategoryKey('품질 개선'), '품질_개선');
  const ok = validateCategoryDraft({ label: '기술대응' }, EXISTING);
  assert.equal(ok.isValid, true);
  assert.equal(ok.categoryKey, '기술대응');

  const dup = validateCategoryDraft({ label: '연구' }, EXISTING);
  assert.equal(dup.isValid, false);

  const blank = validateCategoryDraft({ label: '  ' }, EXISTING);
  assert.equal(blank.isValid, false);
  console.log('✅ Case 1: slugify + validateCategoryDraft');
}

{
  const active = listActiveCategories(EXISTING);
  assert.equal(active.length, 2);
  assert.equal(active[0].categoryKey, 'research');

  const archived = archiveCategory(EXISTING[0], '2026-10-21T00:00:00.000Z');
  assert.equal(archived.isActive, false);
  assert.ok(archived.archivedAt);

  const restored = restoreCategory(archived);
  assert.equal(restored.isActive, true);
  assert.equal(restored.archivedAt, null);
  console.log('✅ Case 2: list/archive/restore');
}

{
  const projects = [
    { id: 'p1', categoryId: 'c1' },
    { id: 'p2', categoryId: 'c2' },
    { id: 'p3', categoryId: null },
  ];
  assert.equal(filterProjectsByCategories(projects, []).length, 3);
  assert.equal(filterProjectsByCategories(projects, ['c1']).length, 1);
  assert.equal(
    filterProjectsByCategories(projects, ['c1'], { includeUncategorized: true }).length,
    2,
  );
  assert.equal(
    filterProjectsByCategories(projects, [], { includeUncategorized: true }).length,
    1,
  );
  console.log('✅ Case 3: filterProjectsByCategories');
}

{
  const seeds = defaultLabCategorySeeds();
  assert.ok(seeds.some((s) => s.categoryKey === 'research'));
  assert.ok(seeds.some((s) => s.label === '품질'));
  console.log('✅ Case 4: defaultLabCategorySeeds');
}

console.log('🎉 All projectCategoryEngine tests passed!');
