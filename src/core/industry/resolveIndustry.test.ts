import assert from 'node:assert/strict';
import { resolveIndustry, resolveIndustryId } from './resolveIndustry';
import { getIndustryPlugin } from './pluginHost';
import { resolveModuleIndustryId } from '../../app/industry/resolveModuleIndustry';
import { resolveIndustryAppKind } from './industryAppResolve';

assert.deepEqual(resolveIndustry(undefined), { status: 'not_loaded', id: null });
assert.deepEqual(resolveIndustry(null), { status: 'blank', id: null });
assert.deepEqual(resolveIndustry('  '), { status: 'blank', id: null });
assert.deepEqual(resolveIndustry('not_a_real_type'), { status: 'unknown', id: null });
assert.deepEqual(resolveIndustry('piano'), { status: 'unknown', id: null });
assert.deepEqual(resolveIndustry('personal_plant_ops'), {
  status: 'known',
  id: 'personal_plant_ops',
});
assert.deepEqual(resolveIndustry('ep_apps'), {
  status: 'known',
  id: 'personal_plant_ops',
});
for (const raw of [undefined, null, '', 'not_a_real_type', 'piano']) {
  assert.equal(resolveIndustryId(raw), null);
  assert.equal(resolveModuleIndustryId(raw), null);
  assert.equal(resolveIndustryAppKind(raw), 'generic');
  if (raw != null && String(raw).trim() !== '') {
    assert.notEqual(getIndustryPlugin(raw).id, 'piano');
  }
}
assert.equal(resolveIndustryAppKind('personal_plant_ops'), 'generic');
console.log('resolveIndustry.test.ts: ok');
