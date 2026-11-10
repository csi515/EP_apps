import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import type { OrgNode, DepartmentMemberRow } from './useOrganizationTree';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { ORG_CHART_COPY } from './orgChartCopy';

const DEPT_DRAG = 'application/x-ep-department';
const MEMBER_DRAG = 'application/x-ep-member';

function isDescendant(nodes: OrgNode[], ancestorId: string, nodeId: string): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  const ancestor = nodes.find((n) => n.id === ancestorId);
  if (!node || !ancestor || node.id === ancestor.id) return false;
  return node.path.startsWith(ancestor.path);
}

function buildChildrenMap(nodes: OrgNode[]): Map<string | null, OrgNode[]> {
  const map = new Map<string | null, OrgNode[]>();
  for (const node of nodes) {
    const key = node.parentId;
    const list = map.get(key) ?? [];
    list.push(node);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }
  return map;
}

function memberLabel(member: DynamicMemberRow): string {
  if (member.name?.trim()) return member.name.trim();
  if (member.email?.trim()) return member.email.trim();
  return `${member.user_id.slice(0, 8)}…`;
}

function matchesQuery(
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
    return memberLabel(m).toLowerCase().includes(q);
  });
}

/** 검색 시 매칭 노드와 조상만 남긴다 */
function filterVisibleIds(
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

interface Props {
  nodes: OrgNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (departmentId: string, newParentId: string | null) => void;
  onReassignMember?: (memberId: string, departmentId: string) => void;
  canManage: boolean;
  editMode?: boolean;
  searchQuery?: string;
  /** 접힌 부서 id (부모 제어) */
  collapsedIds: ReadonlySet<string>;
  onToggleCollapse: (departmentId: string) => void;
  /** 변경 시 해당 노드로 스크롤 */
  scrollToDepartmentId?: string | null;
  departmentMembers?: DepartmentMemberRow[];
  members?: DynamicMemberRow[];
  roles?: DynamicRoleRow[];
}

export const DepartmentTreeView: React.FC<Props> = ({
  nodes,
  selectedId,
  onSelect,
  onMove,
  onReassignMember,
  canManage,
  editMode = false,
  searchQuery = '',
  collapsedIds,
  onToggleCollapse,
  scrollToDepartmentId = null,
  departmentMembers = [],
  members = [],
  roles = [],
}) => {
  const childrenMap = useMemo(() => buildChildrenMap(nodes), [nodes]);
  const visibleIds = useMemo(
    () => filterVisibleIds(nodes, departmentMembers, members, searchQuery),
    [nodes, departmentMembers, members, searchQuery],
  );
  const [dragDeptId, setDragDeptId] = useState<string | null>(null);
  const [dragMemberId, setDragMemberId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const allowDrag = canManage && editMode;

  useEffect(() => {
    if (!scrollToDepartmentId) return;
    const el = document.querySelector<HTMLElement>(
      `[data-dept-id="${CSS.escape(scrollToDepartmentId)}"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [scrollToDepartmentId]);

  const renderBranch = (parentId: string | null, depth: number): React.ReactNode => {
    const children = (childrenMap.get(parentId) ?? []).filter(
      (node) => !visibleIds || visibleIds.has(node.id),
    );
    const guideLeft = Math.min(depth, 6) * 14 - 7;
    return children.map((node, index) => {
      const deptMembers = departmentMembers.filter((dm) => dm.department_id === node.id);
      const leadDm = deptMembers.find((dm) => dm.scope_type === 'DESCENDANTS');
      const leadMember = leadDm ? members.find((m) => m.id === leadDm.member_id) : null;
      const leadRole = leadDm?.custom_role_id
        ? roles.find((r) => r.id === leadDm.custom_role_id)?.name
        : null;
      const childNodes = childrenMap.get(node.id) ?? [];
      const hasChildren = childNodes.some((c) => !visibleIds || visibleIds.has(c.id));
      const isCollapsed = collapsedIds.has(node.id);
      const isDropTarget = dropTargetId === node.id;
      const isSelected = selectedId === node.id;
      const isLastSibling = index === children.length - 1;

      return (
        <li key={node.id} className="list-none relative">
          {depth > 0 ? (
            <>
              {/* 부모에서 내려오는 세로 가이드 (마지막 형제는 카드 중간까지만) */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 w-px bg-slate-300"
                style={{
                  marginLeft: guideLeft,
                  top: 0,
                  bottom: isLastSibling ? 'auto' : 0,
                  height: isLastSibling ? 22 : undefined,
                }}
              />
              {/* 카드로 이어지는 가로 스텁 */}
              <span
                aria-hidden
                className="pointer-events-none absolute h-px bg-slate-300"
                style={{
                  left: guideLeft,
                  top: 22,
                  width: 10,
                }}
              />
            </>
          ) : null}
          <div
            role="treeitem"
            data-dept-id={node.id}
            aria-selected={isSelected}
            aria-expanded={hasChildren ? !isCollapsed : undefined}
            draggable={allowDrag}
            onDragStart={(event) => {
              if (!allowDrag) return;
              event.dataTransfer.setData(DEPT_DRAG, node.id);
              event.dataTransfer.effectAllowed = 'move';
              setDragDeptId(node.id);
            }}
            onDragEnd={() => {
              setDragDeptId(null);
              setDropTargetId(null);
            }}
            onDragOver={(event) => {
              if (!allowDrag) return;
              if (dragDeptId) {
                if (dragDeptId === node.id) return;
                if (isDescendant(nodes, dragDeptId, node.id)) return;
                event.preventDefault();
                setDropTargetId(node.id);
                return;
              }
              if (dragMemberId && onReassignMember) {
                event.preventDefault();
                setDropTargetId(node.id);
              }
            }}
            onDragLeave={() => {
              if (dropTargetId === node.id) setDropTargetId(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const droppedDept = event.dataTransfer.getData(DEPT_DRAG) || dragDeptId || '';
              const droppedMember = event.dataTransfer.getData(MEMBER_DRAG) || dragMemberId || '';
              setDropTargetId(null);
              setDragDeptId(null);
              setDragMemberId(null);
              if (droppedDept && droppedDept !== node.id && !isDescendant(nodes, droppedDept, node.id)) {
                onMove(droppedDept, node.id);
                return;
              }
              if (droppedMember && onReassignMember) {
                onReassignMember(droppedMember, node.id);
              }
            }}
            className={[
              'relative mt-1.5 rounded-2xl border bg-white px-3 py-2.5 text-sm transition-colors',
              isSelected
                ? 'border-indigo-400 ring-1 ring-indigo-100'
                : isDropTarget
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300',
            ].join(' ')}
            style={{ marginLeft: Math.min(depth, 6) * 14 }}
          >
            <div className="flex min-h-11 items-center gap-1.5">
              {hasChildren ? (
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label={isCollapsed ? '펼치기' : '접기'}
                  onClick={() => onToggleCollapse(node.id)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="inline-block h-9 w-9 shrink-0" />
              )}

              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelect(node.id)}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {node.unitKind ? (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                      {node.unitKind}
                    </span>
                  ) : null}
                  <span className="truncate font-bold text-slate-900">{node.name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {ORG_CHART_COPY.memberCount(deptMembers.length)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                  {leadMember ? (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-900">
                      {ORG_CHART_COPY.leader}{' '}
                      {leadRole ? `${leadRole} · ` : ''}
                      {leadMember.name || leadMember.email || '지정됨'}
                    </span>
                  ) : (
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-rose-800">
                      {ORG_CHART_COPY.leaderMissing}
                    </span>
                  )}
                </div>
              </button>

              {allowDrag ? (
                <GripVertical className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
              ) : null}
            </div>

            {editMode && deptMembers.length > 0 ? (
              <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                {deptMembers.map((dm) => {
                  const member = members.find((m) => m.id === dm.member_id);
                  if (!member) return null;
                  const isLead = dm.scope_type === 'DESCENDANTS';
                  return (
                    <li key={dm.id}>
                      <button
                        type="button"
                        draggable={allowDrag && Boolean(onReassignMember)}
                        onDragStart={(event) => {
                          if (!allowDrag || !onReassignMember) return;
                          event.stopPropagation();
                          event.dataTransfer.setData(MEMBER_DRAG, member.id);
                          event.dataTransfer.effectAllowed = 'move';
                          setDragMemberId(member.id);
                        }}
                        onDragEnd={() => setDragMemberId(null)}
                        className={`flex min-h-10 w-full items-center justify-between rounded-lg px-2 text-left text-xs ${
                          isLead ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'
                        }`}
                        title={allowDrag ? '다른 조직으로 끌어 배치' : undefined}
                      >
                        <span className="truncate font-medium">{memberLabel(member)}</span>
                        <span className="shrink-0 text-[10px] font-semibold text-slate-500">
                          {isLead ? ORG_CHART_COPY.scopeLeader : ORG_CHART_COPY.scopeMember}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          {!isCollapsed ? <ul role="group">{renderBranch(node.id, depth + 1)}</ul> : null}
        </li>
      );
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3" data-testid="org-department-tree">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold text-slate-800">{ORG_CHART_COPY.treeHeading}</h2>
        {allowDrag ? (
          <span className="text-[11px] font-medium text-slate-500">{ORG_CHART_COPY.dragHint}</span>
        ) : null}
      </div>

      {allowDrag ? (
        <div
          className={`mb-2 min-h-12 rounded-xl border border-dashed px-3 py-2 text-xs ${
            dropTargetId === '__root__'
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-300 bg-white text-slate-500'
          }`}
          onDragOver={(event) => {
            if (dragDeptId) {
              event.preventDefault();
              setDropTargetId('__root__');
            }
          }}
          onDragLeave={() => {
            if (dropTargetId === '__root__') setDropTargetId(null);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const droppedDept = event.dataTransfer.getData(DEPT_DRAG) || dragDeptId;
            setDropTargetId(null);
            setDragDeptId(null);
            if (droppedDept) onMove(droppedDept, null);
          }}
        >
          {ORG_CHART_COPY.moveRootHint}
        </div>
      ) : null}

      <ul role="tree" className="m-0 p-0">
        {renderBranch(null, 0)}
      </ul>
      {nodes.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">{ORG_CHART_COPY.emptyTree}</p>
      ) : null}
      {nodes.length > 0 && visibleIds && visibleIds.size === 0 ? (
        <p className="p-4 text-sm text-slate-500">검색 결과가 없습니다.</p>
      ) : null}
    </div>
  );
};
