import assert from 'node:assert/strict';
import { ROLE_PERMISSION_KEYS } from './permissions';
import { listCatalogKeys, getPermissionLabel } from './permissionCatalog';

assert.deepEqual(
  [...listCatalogKeys()].sort(),
  [...ROLE_PERMISSION_KEYS].sort(),
  'permissionCatalog must cover every ROLE_PERMISSION_KEYS entry'
);

assert.equal(getPermissionLabel('volunteer:manage'), '봉사활동 게시·모집 관리');
assert.equal(getPermissionLabel('meal_survey:manage'), '식수인원 조사 관리');
assert.equal(getPermissionLabel('roles:assign'), '직급/권한 부여 및 회수');
assert.ok(getPermissionLabel('unknown_key') === 'unknown_key');

console.log('permissionCatalog.test.ts: ok');
