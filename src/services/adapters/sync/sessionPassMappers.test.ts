import assert from 'node:assert/strict';
import {
  calculateRemainingSessions,
  calculateUsedSessions,
  passRowToSessionPass,
  sessionPassToPassRow,
  rowToSessionPass,
  sessionPassToRow,
  type PassRow,
  type SessionPassRow,
} from './sessionPassMappers';
import type { SessionPass } from '@/core/types/schedule';

function runSessionPassMappersTests() {
  console.log('Running sessionPassMappers & DB-002 parity tests...');

  // 1. Math calculation helpers
  assert.equal(calculateRemainingSessions(10, 3), 7);
  assert.equal(calculateRemainingSessions(10, 10), 0);
  assert.equal(calculateRemainingSessions(10, 15), 0); // clamp to 0

  assert.equal(calculateUsedSessions(10, 7), 3);
  assert.equal(calculateUsedSessions(10, 0), 10);
  assert.equal(calculateUsedSessions(10, -2), 10);

  // 2. passRowToSessionPass (core.passes -> SessionPass)
  const passRowActive: PassRow = {
    id: 'pass-uuid-1',
    tenant_id: 'tenant-123',
    customer_id: 'cust-456',
    pass_name: '필라테스 10회권',
    pass_type: 'COUNT_BASED',
    total_count: 10,
    remaining_count: 8,
    status: 'ACTIVE',
    is_active: true,
    start_date: '2026-10-01',
    expires_at: '2026-12-31',
    created_at: '2026-10-01T00:00:00.000Z',
  };

  const domainPass = passRowToSessionPass(passRowActive, '홍길동');
  assert.equal(domainPass.id, 'pass-uuid-1');
  assert.equal(domainPass.customerId, 'cust-456');
  assert.equal(domainPass.customerName, '홍길동');
  assert.equal(domainPass.label, '필라테스 10회권');
  assert.equal(domainPass.totalSessions, 10);
  assert.equal(domainPass.usedSessions, 2); // 10 - 8 = 2 used
  assert.equal(domainPass.status, 'active');
  assert.equal(domainPass.purchasedAt, '2026-10-01T00:00:00.000Z');
  assert.ok(domainPass.expiresAt?.startsWith('2026-12-31'));

  // 3. Status mapping from core.passes to SessionPass
  const passRowExhausted: PassRow = {
    ...passRowActive,
    remaining_count: 0,
    status: 'EXHAUSTED',
  };
  assert.equal(passRowToSessionPass(passRowExhausted).status, 'exhausted');

  const passRowExpired: PassRow = {
    ...passRowActive,
    status: 'EXPIRED',
  };
  assert.equal(passRowToSessionPass(passRowExpired).status, 'cancelled');

  const passRowPaused: PassRow = {
    ...passRowActive,
    status: 'PAUSED',
  };
  assert.equal(passRowToSessionPass(passRowPaused).status, 'cancelled');

  const passRowInactive: PassRow = {
    ...passRowActive,
    is_active: false,
  };
  assert.equal(passRowToSessionPass(passRowInactive).status, 'cancelled');

  // 4. sessionPassToPassRow (SessionPass -> core.passes)
  const sessionPassActive: SessionPass = {
    id: 'sp-uuid-1',
    customerId: 'cust-456',
    customerName: '홍길동',
    label: '피아노 레슨 8회권',
    totalSessions: 8,
    usedSessions: 3,
    status: 'active',
    purchasedAt: '2026-09-01T10:00:00.000Z',
    expiresAt: '2026-12-01T23:59:59.000Z',
  };

  const convertedRow = sessionPassToPassRow(sessionPassActive, 'tenant-org-999');
  assert.equal(convertedRow.id, 'sp-uuid-1');
  assert.equal(convertedRow.tenant_id, 'tenant-org-999');
  assert.equal(convertedRow.customer_id, 'cust-456');
  assert.equal(convertedRow.pass_name, '피아노 레슨 8회권');
  assert.equal(convertedRow.total_count, 8);
  assert.equal(convertedRow.remaining_count, 5); // 8 - 3 = 5 remaining
  assert.equal(convertedRow.status, 'ACTIVE');
  assert.equal(convertedRow.is_active, true);
  assert.equal(convertedRow.start_date, '2026-09-01');
  assert.equal(convertedRow.expires_at, '2026-12-01');

  // 5. Roundtrip consistency
  const roundtrip = passRowToSessionPass(convertedRow, '홍길동');
  assert.equal(roundtrip.id, sessionPassActive.id);
  assert.equal(roundtrip.totalSessions, sessionPassActive.totalSessions);
  assert.equal(roundtrip.usedSessions, sessionPassActive.usedSessions);
  assert.equal(roundtrip.status, sessionPassActive.status);

  // 6. Existing SessionPassRow backward compatibility
  const legacyRow: SessionPassRow = {
    id: 'legacy-1',
    organization_id: 'org-legacy',
    customer_id: 'cust-legacy',
    customer_name: '이순신',
    label: '기존 이용권',
    total_sessions: 20,
    used_sessions: 5,
    status: 'active',
    purchased_at: '2026-08-01T00:00:00.000Z',
    expires_at: null,
    memo: '비고',
  };
  const fromLegacy = rowToSessionPass(legacyRow);
  assert.equal(fromLegacy.totalSessions, 20);
  assert.equal(fromLegacy.usedSessions, 5);

  const backToLegacy = sessionPassToRow(fromLegacy, 'org-legacy');
  assert.equal(backToLegacy.total_sessions, 20);
  assert.equal(backToLegacy.used_sessions, 5);
  assert.equal(backToLegacy.organization_id, 'org-legacy');

  console.log('[test:session-pass-mappers] all assertions passed successfully!');
}

runSessionPassMappersTests();
