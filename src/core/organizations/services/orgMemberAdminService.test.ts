/**
 * 실행: npx tsx src/core/organizations/services/orgMemberAdminService.test.ts
 */
import assert from 'node:assert/strict';
import {
  generateInitialPassword,
  summarizeMemberEffectiveAccess,
} from './orgMemberAdminService';
import type { DynamicMemberRow, DynamicRoleRow } from './dynamicRoleService';
import { EMPTY_ROLE_PERMISSIONS } from '@/domain/permissions';

const member: DynamicMemberRow = {
  id: 'm1',
  user_id: 'u1',
  role: 'staff',
  organization_role_id: 'r1',
  login_id: 'kim.cs',
  name: '김철수',
  feature_permissions: {
    'company_app:mbo': true,
  },
};

const role: DynamicRoleRow = {
  id: 'r1',
  name: '팀원',
  description: '',
  is_system: false,
  permissions: { ...EMPTY_ROLE_PERMISSIONS, 'mbo:goals:read': true },
};

const summary = summarizeMemberEffectiveAccess(member, role);
assert.ok(summary.total > 0);
assert.ok(summary.granted >= 1);
assert.ok(summary.byApp.some((a) => a.appId === 'mbo' && a.state === 'granted'));

const pwd = generateInitialPassword(12);
assert.equal(pwd.length, 12);

console.log('orgMemberAdminService.test.ts: ok');
