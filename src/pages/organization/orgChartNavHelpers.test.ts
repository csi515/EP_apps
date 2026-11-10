/**
 * 실행: npx tsx src/pages/organization/orgChartNavHelpers.test.ts
 */
import assert from 'node:assert/strict';
import {
  listAncestorDepartmentIds,
  listDepartmentsMissingLeaders,
  listParentDepartmentIds,
  resolvePrimaryDepartmentIdForUser,
} from './orgChartNavHelpers';

const nodes = [
  { id: 'root', name: '본사', parentId: null, path: '/root/', unitKind: null, code: null },
  { id: 'group', name: '그룹', parentId: 'root', path: '/root/group/', unitKind: null, code: null },
  { id: 'team', name: '팀', parentId: 'group', path: '/root/group/team/', unitKind: null, code: null },
];

const dms = [
  { id: '1', department_id: 'root', member_id: 'm-ceo', scope_type: 'DESCENDANTS' as const, custom_role_id: null },
  { id: '2', department_id: 'team', member_id: 'm-staff', scope_type: 'SELF_ONLY' as const, custom_role_id: null },
];

const members = [
  { id: 'm-ceo', user_id: 'u-ceo', role: 'owner', organization_role_id: null, name: '대표' },
  { id: 'm-staff', user_id: 'u-staff', role: 'staff', organization_role_id: null, name: '사원' },
];

{
  const missing = listDepartmentsMissingLeaders(nodes, dms);
  assert.equal(missing.some((n) => n.id === 'group'), true);
  assert.equal(missing.some((n) => n.id === 'team'), true);
  assert.equal(missing.some((n) => n.id === 'root'), false);
}

{
  assert.equal(resolvePrimaryDepartmentIdForUser('u-staff', members, dms), 'team');
  assert.equal(resolvePrimaryDepartmentIdForUser('missing', members, dms), null);
}

{
  assert.deepEqual(listAncestorDepartmentIds('team', nodes), ['group', 'root']);
  assert.deepEqual(listParentDepartmentIds(nodes).sort(), ['group', 'root'].sort());
}

console.log('orgChartNavHelpers.test.ts: ok');
