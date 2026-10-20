import assert from 'node:assert/strict';
import {
  OPS_CAPABILITY_IDS,
  OPS_CAPABILITY_READINESS,
  assertAllOpsVerified,
  isOpsVerified,
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

assert.equal(resourceHiddenByCapabilities('rental_equipments', ['rental_equipment']), true);
assert.equal(resourceHiddenByCapabilities('rental_equipments', []), false);
assert.equal(resourceHiddenByCapabilities('dashboard', ['rental_equipment']), false);

console.log('opsCapabilityReadiness.test.ts: ok');
