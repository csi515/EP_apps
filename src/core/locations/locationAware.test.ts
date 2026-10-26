/**
 * LocationAware 분류·호환 규칙.
 * 실행: npm run test:location-aware
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOCATION_SCOPE_POLICY,
  NEW_LOCATION_SCOPED_TABLE_RULES,
  ORGANIZATION_SCOPE_POLICY,
  canAccessLocation,
  filterAccessibleLocations,
  locationBusinessDate,
  pickOrganizationTimezone,
  resolveLocationTimezone,
  toLocationAware,
} from './locationAware';
import type { LocationAccessContext } from './types';
import {
  domainScopeKind,
  LOCATION_AWARE_ENTITIES,
  LOCATION_SCOPED_ENTITY_KEYS,
  ORGANIZATION_SCOPED_ENTITY_KEYS,
  policyForEntity,
} from './locationAwareRegistry';
import {
  assertLocationInOrganization,
  locationAwareVisible,
  locationBelongsToOrganization,
  LocationAwareError,
  policyForExistingDomain,
  policyForNewDomain,
  resolveWriteLocationId,
} from './locationAwareRules';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');

function run() {
  assert.equal(domainScopeKind('customers'), 'organization');
  assert.equal(domainScopeKind('products'), 'organization');
  assert.equal(domainScopeKind('service_catalog'), 'organization');
  assert.equal(domainScopeKind('staff'), 'organization');
  assert.equal(domainScopeKind('price_catalog'), 'organization');
  assert.equal(domainScopeKind('visits'), 'location');
  assert.equal(domainScopeKind('bookings'), 'location');
  assert.equal(domainScopeKind('rooms'), 'location');
  assert.equal(domainScopeKind('resources'), 'location');
  assert.equal(domainScopeKind('sales'), 'location');
  assert.equal(domainScopeKind('inventory'), 'location');
  assert.equal(domainScopeKind('schedules'), 'location');
  assert.equal(domainScopeKind('operational_tasks'), 'location');
  assert.equal(domainScopeKind('unknown'), null);

  for (const entity of LOCATION_AWARE_ENTITIES) {
    assert.equal(entity.hasLocationColumn, false);
  }
  assert.equal(ORGANIZATION_SCOPED_ENTITY_KEYS.length, 5);
  assert.equal(LOCATION_SCOPED_ENTITY_KEYS.length, 8);

  const org = toLocationAware('org-a');
  assert.equal(org.organizationId, 'org-a');
  assert.equal(org.locationId, null);

  const sales = LOCATION_AWARE_ENTITIES.find((row) => row.key === 'sales');
  assert.ok(sales);
  assert.equal(policyForEntity(sales).requireLocationOnWrite, false);
  assert.equal(resolveWriteLocationId(sales, 'loc-a'), null);
  assert.equal(resolveWriteLocationId(ORGANIZATION_SCOPE_POLICY, 'loc-a'), null);
  assert.equal(resolveWriteLocationId(policyForNewDomain('location'), 'loc-a'), 'loc-a');
  assert.throws(
    () => resolveWriteLocationId(policyForNewDomain('location'), null),
    (err: unknown) => err instanceof LocationAwareError && err.code === 'location_required'
  );
  assert.equal(policyForExistingDomain('location').requireLocationOnWrite, false);

  const locations = [
    { id: 'loc-a', organizationId: 'org-a' },
    { id: 'loc-b', organizationId: 'org-b' },
  ];
  assert.equal(locationBelongsToOrganization(locations, 'org-a', 'loc-a'), true);
  assert.equal(locationBelongsToOrganization(locations, 'org-a', 'loc-b'), false);
  assert.equal(locationBelongsToOrganization(locations, 'org-a', null), false);
  assert.equal(assertLocationInOrganization(locations, 'org-a', null, false), null);
  assert.throws(
    () => assertLocationInOrganization(locations, 'org-a', null, true),
    (err: unknown) => err instanceof LocationAwareError && err.code === 'location_required'
  );
  assert.throws(
    () => assertLocationInOrganization(locations, 'org-a', 'loc-b', true),
    (err: unknown) => err instanceof LocationAwareError && err.code === 'org_mismatch'
  );

  const legacy = toLocationAware('org-a', null);
  const assigned = toLocationAware('org-a', 'loc-a');
  assert.equal(locationAwareVisible(legacy, null), true);
  assert.equal(locationAwareVisible(assigned, null), true);
  assert.equal(locationAwareVisible(legacy, 'loc-a'), true);
  assert.equal(locationAwareVisible(assigned, 'loc-a'), true);
  assert.equal(locationAwareVisible(assigned, 'loc-b'), false);
  assert.equal(locationAwareVisible(legacy, 'loc-a', { ...LOCATION_SCOPE_POLICY, includeUnassignedOnRead: false }), false);

  assert.equal(NEW_LOCATION_SCOPED_TABLE_RULES.locationNullable, false);
  assert.equal(NEW_LOCATION_SCOPED_TABLE_RULES.replaceOrganizationId, false);

  console.log('locationAware.test.ts: ok');
}

run();
