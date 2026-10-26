/**
 * Customer Session Capability. 실행: npm run test:customer-session
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapCustomerSessionRpcError } from './sessionErrors';
import { rowToCustomerSession, rpcPayloadToSessionResult, type CustomerSessionRow } from './sessionMappers';
import {
  evaluateSessionCancel,
  evaluateSessionFinish,
  evaluateSessionStart,
} from './transitions';
import { CUSTOMER_SESSION_SOURCES, CUSTOMER_SESSION_STATUSES } from './types';

const here = dirname(fileURLToPath(import.meta.url));

function run() {
  assert.deepEqual([...CUSTOMER_SESSION_STATUSES], ['active', 'completed', 'cancelled']);
  assert.ok(CUSTOMER_SESSION_SOURCES.includes('walk_in'));
  assert.ok(CUSTOMER_SESSION_SOURCES.includes('booking'));

  assert.deepEqual(evaluateSessionStart(false), { ok: true, action: 'create' });
  assert.deepEqual(evaluateSessionStart(true), { ok: true, action: 'idempotent' });

  assert.deepEqual(evaluateSessionFinish('active'), { ok: true, action: 'completed' });
  assert.deepEqual(evaluateSessionFinish('completed'), { ok: true, action: 'idempotent' });
  assert.deepEqual(evaluateSessionFinish('cancelled'), { ok: false, reason: 'not_active' });

  assert.deepEqual(evaluateSessionCancel('active'), { ok: true, action: 'cancelled' });
  assert.deepEqual(evaluateSessionCancel('cancelled'), { ok: true, action: 'idempotent' });
  assert.deepEqual(evaluateSessionCancel('completed'), { ok: false, reason: 'not_cancellable' });

  assert.equal(mapCustomerSessionRpcError({ message: 'Permission denied' }).code, 'permission');
  assert.equal(mapCustomerSessionRpcError({ message: 'Session not active' }).code, 'not_active');
  assert.equal(mapCustomerSessionRpcError({ message: 'Customer not found in organization' }).code, 'customer');
  assert.equal(mapCustomerSessionRpcError({ message: 'Organization mismatch' }).code, 'org_mismatch');

  const row: CustomerSessionRow = {
    id: 's1',
    organization_id: 'org-1',
    customer_id: 'c1',
    started_at: '2026-09-24T01:00:00.000Z',
    ended_at: null,
    status: 'active',
    source: 'walk_in',
    context: null,
    staff_id: 'st-1',
    booking_id: null,
    reservation_id: null,
    pass_id: null,
    payment_id: null,
    resource_id: 'res-1',
    memo: null,
    metadata: {},
    created_at: '2026-09-24T01:00:00.000Z',
    updated_at: '2026-09-24T01:00:00.000Z',
    action: 'created',
  };
  const session = rowToCustomerSession(row);
  assert.equal(session.status, 'active');
  assert.equal(session.resourceId, 'res-1');
  assert.equal(session.bookingId, undefined);
  assert.equal(rpcPayloadToSessionResult(row).action, 'created');

  const service = readFileSync(join(here, 'sessionService.ts'), 'utf8');
  assert.match(service, /start_customer_session/);
  assert.match(service, /finish_customer_session/);
  assert.match(service, /getActive/);
  assert.doesNotMatch(service, /create_sale/);
  assert.doesNotMatch(service, /bath\.|sauna|pilates|piano/);

  const repo = readFileSync(join(here, 'sessionRepository.ts'), 'utf8');
  assert.match(repo, /eq\('organization_id', organizationId\)/);
  assert.match(repo, /status.*active/);

  const capability = readFileSync(join(here, 'sessionCapability.ts'), 'utf8');
  assert.match(capability, /customerSessionService/);
  assert.doesNotMatch(capability, /bath|sauna|piano|pilates|skin|retail/i);

  console.log('sessionCapability.test.ts: ok');
}

run();
