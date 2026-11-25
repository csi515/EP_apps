/**
 * DepartmentTreeView 검색·DnD·들여쓰기 순수 헬퍼
 */

import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import { memberDisplayLabel } from '@/core/organizations/orgChartPrimitives';
import type { OrgNode, DepartmentMemberRow } from './useOrganizationTree';

/** depth당 들여쓰기(px) — 깊은 계층도 구분되게 */
export const INDENT_PX = 18;
export const MAX_DEPTH_INDENT = 12;

export function isDescendant(nodes: OrgNode[], ancestorId: string, nodeId: string): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  const ancestor = nodes.find((n) => n.id === ancestorId);
  if (!node || !ancestor || node.id === ancestor.id) return false;
  return node.path.startsWith(ancestor.path);
}

export function matchesQuery(
  node: OrgNode,
  deptMembers: DepartmentMemberRow[],
  members: DynamicMemberRow[],
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (node.name.toLowerCase().includes(q)) return true;
  if ((node.unitKind ?? '').toLowerCase().includes(q)) return true;
  return deptMembers.some((dm) => {
    const m = members.find((row) => row.id === dm.member_id);
    if (!m) return false;
    return memberDisplayLabel(m).toLowerCase().includes(q);
  });
}

/** 검색 시 매칭 노드와 조상만 남긴다 */
export function filterVisibleIds(
  nodes: OrgNode[],
  departmentMembers: DepartmentMemberRow[],
  members: DynamicMemberRow[],
  query: string,
): Set<string> | null {
  if (!query.trim()) return null;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visible = new Set<string>();
  for (const node of nodes) {
    const dms = departmentMembers.filter((dm) => dm.department_id === node.id);
    if (!matchesQuery(node, dms, members, query)) continue;
    let cur: OrgNode | undefined = node;
    while (cur) {
      visible.add(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
  }
  return visible;
}

export function indentForDepth(depth: number): number {
  return Math.min(depth, MAX_DEPTH_INDENT) * INDENT_PX;
}

/** 부서를 다른 부서 아래로 드롭해도 되는지 (자기 자신·자손 금지) */
export function canDropDepartmentOnto(
  nodes: OrgNode[],
  draggedDeptId: string,
  targetDeptId: string,
): boolean {
  if (draggedDeptId === targetDeptId) return false;
  if (isDescendant(nodes, draggedDeptId, targetDeptId)) return false;
  return true;
}
