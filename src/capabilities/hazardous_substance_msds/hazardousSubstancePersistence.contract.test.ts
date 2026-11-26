/**
 * 유해화학물질 MSDS — Refine 리소스 vs DB/tenant 영속화 계약
 * 실행: npx tsx src/capabilities/hazardous_substance_msds/hazardousSubstancePersistence.contract.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { hazardousSubstanceMsdsResources } from './resources';
import {
  HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED,
  HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE,
} from './persistence';
import { mapHazardousSubstanceRowToReagent } from './hooks/useHazardousSubstanceReagents';

const resourceNames = hazardousSubstanceMsdsResources.resources.map((r) => r.name);
assert.ok(resourceNames.includes(HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE), 'Refine resource declared');
assert.equal(
  HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED,
  false,
  'W0: persistence stays off until migration + dataProvider tenant scope',
);

const dataProviderPath = join(dirname(fileURLToPath(import.meta.url)), '../../providers/dataProvider.ts');
const dataProviderSource = readFileSync(dataProviderPath, 'utf8');
assert.ok(
  !dataProviderSource.includes(`"${HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE}"`),
  'hazardous_substances must not be in TENANT_SCOPED_RESOURCES until schema exists',
);

const viewPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'ui',
  'HazardousSubstanceManagementView.tsx',
);
const viewSource = readFileSync(viewPath, 'utf8');
const forbiddenDemoInventoryPatterns = [
  'INITIAL_REAGENTS',
  'MOCK_REAGENTS',
  'DEMO_REAGENTS',
  'SEED_REAGENTS',
  'inventoryLocalDemo',
  'shouldSeedInventoryDemoCatalog',
] as const;
for (const pattern of forbiddenDemoInventoryPatterns) {
  assert.ok(
    !viewSource.includes(pattern),
    `HazardousSubstanceManagementView must not reintroduce demo inventory (${pattern})`,
  );
}

const mapped = mapHazardousSubstanceRowToReagent({ id: 'row-1', name: '시험 시약', cas_number: '67-64-1' });
assert.equal(mapped.id, 'row-1');
assert.equal(mapped.casNumber, '67-64-1');
assert.deepEqual(mapped.hazardClasses, ['general']);

console.log('hazardousSubstancePersistence.contract.test.ts: ok');