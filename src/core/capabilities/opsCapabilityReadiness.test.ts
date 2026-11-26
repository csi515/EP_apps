import assert from 'node:assert/strict';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import {
  OPS_CAPABILITY_IDS,
  OPS_CAPABILITY_READINESS,
  PLANT_REQUIRED_CAPABILITY_IDS,
  assertAllOpsVerified,
  isOpsVerified,
  plantRequiredInOpsSnapshot,
  resourceHiddenByCapabilities,
} from './opsCapabilityReadiness';

assert.equal(OPS_CAPABILITY_IDS.length, 11);

for (const id of OPS_CAPABILITY_IDS) {
  const meta = OPS_CAPABILITY_READINESS[id];
  assert.ok(meta.refineResource.length > 0, `${id} refineResource`);
  assert.ok(['supabase', 'local', 'hybrid'].includes(meta.persistence), `${id} persistence`);
  assert.ok(['demo', 'basic_ui', 'ops_verified'].includes(meta.opsReadiness), `${id} opsReadiness`);
  assert.equal(isOpsVerified(id), true, `${id} must be ops_verified with supabase`);
}

assertAllOpsVerified();

assert.equal(PLANT_REQUIRED_CAPABILITY_IDS.length, 8);
const plantPreset = getIndustryPreset('personal_plant_ops');
assert.deepEqual(
  [...PLANT_REQUIRED_CAPABILITY_IDS],
  [...(plantPreset?.requiredCapabilities ?? [])],
  'PLANT_REQUIRED_CAPABILITY_IDS must mirror preset requiredCapabilities',
);
const opsSet = new Set<string>(OPS_CAPABILITY_IDS);
const notInOps = PLANT_REQUIRED_CAPABILITY_IDS.filter((id) => !opsSet.has(id));
assert.ok(notInOps.length > 0, 'plant required vs OPS_CAPABILITY_IDS mismatch is expected until plant ops list is redefined');
assert.deepEqual(plantRequiredInOpsSnapshot(), ['booking', 'sop_risk_assessment']);

assert.equal(resourceHiddenByCapabilities('rental_equipments', ['rental_equipment']), true);
assert.equal(resourceHiddenByCapabilities('rental_equipments', []), false);
assert.equal(resourceHiddenByCapabilities('dashboard', ['rental_equipment']), false);

console.log('opsCapabilityReadiness.test.ts: ok');
