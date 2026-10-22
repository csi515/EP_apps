/**
 * personal_plant_ops 런처 타일 게이트.
 * 실행: npx tsx src/pages/workspace/companyAppLauncherGate.test.ts
 */
import assert from 'node:assert/strict';
import { INDUSTRY_PRESETS } from '@/app/presets/presetRegistry';
import { resolveEnabledCaps, tileAllowed } from './CompanyAppLauncherDashboard';

const plant = INDUSTRY_PRESETS.personal_plant_ops;
assert.ok(plant);

const enabled = resolveEnabledCaps(
  'personal_plant_ops',
  [],
  [],
  []
);

assert.ok(enabled.includes('approval_workflow'));
assert.ok(enabled.includes('mbo'));
assert.ok(enabled.includes('inventory'));
assert.ok(enabled.includes('whistleblower_grievance'));
assert.ok(enabled.includes('office_supply_request'));
assert.ok(!enabled.includes('recipe_bom'), 'default hidden BOM');
assert.ok(!enabled.includes('supply_restock'), 'default hidden supply');

assert.equal(tileAllowed({ requiredAnyCapability: ['vehicle_shuttle'] } as never, enabled), false);
assert.equal(tileAllowed({ requiredAnyCapability: ['feedbacks'] } as never, enabled), false);
assert.equal(tileAllowed({ requiredAnyCapability: ['approval_workflow'] } as never, enabled), true);
assert.equal(tileAllowed({ requiredAnyCapability: ['booking', 'seat_room'] } as never, enabled), true);
assert.equal(tileAllowed({ requiredAnyCapability: ['office_supply_request'] } as never, enabled), true);

assert.equal(plant.readinessLevel, 'isolated');

console.log('companyAppLauncherGate.test.ts: ok');
