/**
 * Industry 카탈로그 불변조건 — EP_apps personal_plant_ops 단일.
 * 실행: npx tsx src/core/industry/industryCatalog.test.ts
 */
import assert from 'node:assert/strict';
import {
  INDUSTRY_IDS,
  INDUSTRY_DEFINITIONS,
  INDUSTRY_ALIASES,
  MODULE_INDUSTRY_IDS,
  PUBLIC_SELECTABLE_INDUSTRY_IDS,
  isIndustryType,
  listIndustryDefinitions,
  hasIndustryModule,
  getIndustryDefinition,
  shouldUseGenericShell,
} from './catalog';
import {
  normalizeIndustryType,
  getIndustryLabel,
  getIndustryCategoryForType,
  resolveIndustryCategoryForCreate,
  assertCatalogIntegrity,
} from './types';

function run(): void {
  assertCatalogIntegrity();

  assert.deepEqual(INDUSTRY_IDS, ['personal_plant_ops']);
  assert.equal(Object.keys(INDUSTRY_DEFINITIONS).length, 1);
  assert.deepEqual(MODULE_INDUSTRY_IDS, []);
  assert.deepEqual([...PUBLIC_SELECTABLE_INDUSTRY_IDS], ['personal_plant_ops']);

  assert.ok(isIndustryType('personal_plant_ops'));
  assert.equal(isIndustryType('piano'), false);
  assert.equal(hasIndustryModule('personal_plant_ops'), false);
  assert.equal(shouldUseGenericShell('personal_plant_ops'), true);

  assert.equal(normalizeIndustryType('personal_plant'), 'personal_plant_ops');
  assert.equal(normalizeIndustryType('ep_apps'), 'personal_plant_ops');
  assert.equal(INDUSTRY_ALIASES.ep_apps, 'personal_plant_ops');
  assert.equal(normalizeIndustryType('piano'), null);
  assert.equal(normalizeIndustryType(null), null);
  assert.equal(normalizeIndustryType(''), null);
  assert.equal(shouldUseGenericShell('not_a_real_type'), true);

  assert.equal(getIndustryLabel('personal_plant_ops'), 'EP_apps');
  assert.equal(getIndustryCategoryForType('personal_plant_ops'), 'other');
  assert.equal(resolveIndustryCategoryForCreate('personal_plant_ops'), 'other');

  const selectable = listIndustryDefinitions({ selectableOnly: true });
  assert.equal(selectable.length, 1);
  assert.equal(selectable[0].id, 'personal_plant_ops');
  assert.equal(INDUSTRY_DEFINITIONS.personal_plant_ops.selectable, true);
  assert.equal(getIndustryDefinition('EP_apps')?.id, 'personal_plant_ops');

  console.log('industryCatalog.test.ts: ok');
}

run();
