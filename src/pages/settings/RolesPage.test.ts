import assert from 'node:assert/strict';
import { PERMISSION_GROUPS } from './RolesPage';

console.log('[TEST] RolesPage permission groups test suite starting...');

// 1. 최소 8개 이상의 운영 영역 권한 그룹이 존재하는지 검증
assert.ok(
  PERMISSION_GROUPS.length >= 8,
  `Expected at least 8 permission groups, got ${PERMISSION_GROUPS.length}`
);
console.log(`✓ 8 core permission groups verified (${PERMISSION_GROUPS.length} groups)`);

// 2. 모든 권한 키의 고유성(Uniqueness) 및 포맷 검증
const seenKeys = new Set<string>();
for (const group of PERMISSION_GROUPS) {
  assert.ok(group.category && group.category.trim().length > 0, 'Group category required');
  assert.ok(group.domain && group.domain.trim().length > 0, 'Group domain required');
  assert.ok(group.items && group.items.length > 0, 'Group must have at least 1 item');

  for (const item of group.items) {
    assert.ok(item.key && item.key.includes(':'), `Item key must follow domain:action format, got ${item.key}`);
    assert.ok(item.label && item.label.trim().length > 0, `Item label required for ${item.key}`);
    assert.equal(
      seenKeys.has(item.key),
      false,
      `Duplicate permission key detected: ${item.key}`
    );
    seenKeys.add(item.key);
  }
}
console.log(`✓ All ${seenKeys.size} permission keys are unique and well-formatted`);

// 3. 핵심 도메인 포함 여부 검증
const expectedDomains = [
  'passes',
  'attendance',
  'booking',
  'crm',
  'lockers',
  'settlement',
  'facility',
  'operations',
];

for (const d of expectedDomains) {
  assert.ok(
    PERMISSION_GROUPS.some((g) => g.domain === d),
    `Expected domain '${d}' to be present in PERMISSION_GROUPS`
  );
}
console.log('✓ All expected operational domains (passes, attendance, booking, crm, etc.) present');

console.log('[TEST] RolesPage permission groups tests PASSED!');
