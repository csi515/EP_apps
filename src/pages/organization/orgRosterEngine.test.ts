/**
 * 실행: npx tsx src/pages/organization/orgRosterEngine.test.ts
 */
import assert from 'node:assert/strict';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import type { DepartmentMemberRow, OrgNode } from './useOrganizationTree';
import {
  buildOrgRosterRows,
  filterOrgRosterRows,
  formatRosterExportFilename,
  resolveDepartmentName,
  resolvePrimaryPlacement,
  sortOrgRosterRows,
} from './orgRosterEngine';
import { EMPTY_ROLE_PERMISSIONS } from '@/domain/permissions';

const roles: DynamicRoleRow[] = [
  {
    id: 'role-mgr',
    name: '과장',
    description: '',
    is_system: false,
    permissions: EMPTY_ROLE_PERMISSIONS,
  },
];

function node(
  id: string,
  name: string,
  parentId: string | null,
  path: string,
  unitKind: string | null,
): OrgNode {
  return { id, name, parentId, path, unitKind, code: null };
}

const sil = node('d1', '생산실', null, '/d1/', '실');
const group = node('d2', '기술그룹', 'd1', '/d1/d2/', '그룹');
const section = node('d3', '설비섹션', 'd2', '/d1/d2/d3/', '섹션');
const part = node('d4', 'A파트', 'd3', '/d1/d2/d3/d4/', '파트');
const nodes = [sil, group, section, part];

{
  const byId = new Map(nodes.map((n) => [n.id, n]));
  assert.equal(resolveDepartmentName('d4', byId), 'A파트');
  assert.equal(resolveDepartmentName(null, byId), '');
}

{
  const placements: DepartmentMemberRow[] = [
    {
      id: 'p1',
      department_id: 'd2',
      member_id: 'm1',
      scope_type: 'DESCENDANTS',
      custom_role_id: null,
    },
    {
      id: 'p2',
      department_id: 'd4',
      member_id: 'm1',
      scope_type: 'SELF_ONLY',
      custom_role_id: null,
    },
  ];
  assert.equal(resolvePrimaryPlacement('m1', placements)?.department_id, 'd4');
}

{
  const members: DynamicMemberRow[] = [
    {
      id: 'm1',
      user_id: 'u1',
      role: 'staff',
      organization_role_id: 'role-mgr',
      is_active: true,
      login_id: 'E001',
      name: '김테스트',
      email: 'a@example.com',
    },
    {
      id: 'm2',
      user_id: 'u2',
      role: 'staff',
      organization_role_id: null,
      is_active: false,
      login_id: 'E002',
      name: '이미배치',
      email: 'b@example.com',
    },
  ];
  const departmentMembers: DepartmentMemberRow[] = [
    {
      id: 'p1',
      department_id: 'd4',
      member_id: 'm1',
      scope_type: 'SELF_ONLY',
      custom_role_id: null,
    },
  ];
  const rows = buildOrgRosterRows({ members, nodes, departmentMembers, roles });
  assert.equal(rows[0]?.departmentName, 'A파트');
  assert.equal(rows[0]?.roleName, '과장');
  assert.equal(rows[1]?.departmentId, null);
  assert.equal(rows[1]?.departmentName, '');
}

{
  const rows = buildOrgRosterRows({
    members: [
      {
        id: 'm1',
        user_id: 'u1',
        role: 'staff',
        organization_role_id: null,
        is_active: true,
        login_id: 'E001',
        name: '김활성',
        email: 'a@x.com',
      },
      {
        id: 'm2',
        user_id: 'u2',
        role: 'staff',
        organization_role_id: null,
        is_active: false,
        login_id: 'E002',
        name: '박비활성',
        email: 'b@x.com',
      },
    ],
    nodes,
    departmentMembers: [
      {
        id: 'p1',
        department_id: 'd4',
        member_id: 'm1',
        scope_type: 'SELF_ONLY',
        custom_role_id: null,
      },
    ],
    roles,
  });

  const byName = filterOrgRosterRows(rows, {
    query: '김활',
    employment: 'active',
  });
  assert.equal(byName.length, 1);
  assert.equal(byName[0]?.memberId, 'm1');

  const inactive = filterOrgRosterRows(rows, {
    query: '',
    employment: 'inactive',
  });
  assert.deepEqual(
    inactive.map((r) => r.memberId),
    ['m2'],
  );
}

{
  const sorted = sortOrgRosterRows(
    [
      {
        memberId: '2',
        loginId: 'B',
        name: '이',
        email: '',
        phone: '',
        roleId: null,
        roleName: '',
        placementRoleId: null,
        departmentId: null,
        departmentName: '운영팀',
        isActive: true,
        joinedAt: null,
      },
      {
        memberId: '1',
        loginId: 'A',
        name: '김',
        email: '',
        phone: '',
        roleId: null,
        roleName: '',
        placementRoleId: null,
        departmentId: 'd4',
        departmentName: 'A파트',
        isActive: true,
        joinedAt: null,
      },
    ],
    'name',
    'asc',
  );
  assert.deepEqual(
    sorted.map((r) => r.name),
    ['김', '이'],
  );
  assert.equal(
    formatRosterExportFilename(new Date('2026-11-24T00:00:00')),
    '전사_직원_조직현황_20261124.xlsx',
  );
}

console.log('orgRosterEngine.test.ts: ok');
