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
  HAZARDOUS_SUBSTANCE_USAGE_LOG_RESOURCE,
} from './persistence';
import {
  mapHazardousSubstanceRowToReagent,
  mapReagentFormToHazardousSubstanceRowValues,
} from './hooks/useHazardousSubstanceReagents';

const resourceNames = hazardousSubstanceMsdsResources.resources.map((r) => r.name);
assert.ok(resourceNames.includes(HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE), 'Refine resource declared');
assert.equal(
  HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED,
  true,
  'R1: persistence enabled after TENANT_SCOPED registration (migration apply is ops checklist)',
);

const dataProviderPath = join(dirname(fileURLToPath(import.meta.url)), '../../providers/dataProvider.ts');
const dataProviderSource = readFileSync(dataProviderPath, 'utf8');
for (const resource of [HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE, HAZARDOUS_SUBSTANCE_USAGE_LOG_RESOURCE] as const) {
  assert.ok(
    dataProviderSource.includes(`"${resource}"`),
    `${resource} must be in TENANT_SCOPED_RESOURCES`,
  );
}

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

const mapped = mapHazardousSubstanceRowToReagent({
  id: 'row-1',
  name: '시험 시약',
  cas_number: '67-64-1',
  hazard_classes: ['flammable', 'organic_solvent'],
  msds_pdf_url: 'https://example.com/msds/acetone.pdf',
  storage_cabinet_name: '방폭 시약장 F-01',
  current_stock: 12.5,
  min_safe_stock: 4,
  unit: 'L',
  is_regulated_precursor: true,
});
assert.equal(mapped.id, 'row-1');
assert.equal(mapped.casNumber, '67-64-1');
assert.deepEqual(mapped.hazardClasses, ['flammable', 'organic_solvent']);
assert.equal(mapped.msdsPdfUrl, 'https://example.com/msds/acetone.pdf');
assert.equal(mapped.currentStock, 12.5);
assert.equal(mapped.isRegulatedPrecursor, true);

const persisted = mapReagentFormToHazardousSubstanceRowValues({
  name: '아세톤',
  casNumber: '67-64-1',
  hazardClasses: ['flammable'],
  storageCabinetName: 'F-01',
  currentStock: 1000,
  minSafeStock: 300,
  unit: 'mL',
  msdsPdfUrl: 'https://example.com/msds.pdf',
});
assert.equal(persisted.cas_number, '67-64-1');
assert.deepEqual(persisted.hazard_classes, ['flammable']);
assert.equal(persisted.msds_pdf_url, 'https://example.com/msds.pdf');

console.log('hazardousSubstancePersistence.contract.test.ts: ok');