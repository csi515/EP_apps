import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus } from 'lucide-react';
import type { OrgNode, DepartmentMemberRow } from './useOrganizationTree';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { ORG_CHART_COPY } from './orgChartCopy';
import { DEPT_DRAG_MIME, MEMBER_DRAG_MIME } from './orgMemberDrag';

const DEPT_DRAG = DEPT_DRAG_MIME;
/** depth당 들여쓰기(px) — 깊은 계층도 구분되게 */
const INDENT_PX = 18;
const MAX_DEPTH_INDENT = 12;

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

function indentForDepth(depth: number): number {
  return Math.min(depth, MAX_DEPTH_INDENT) * INDENT_PX;
}

interface Props {
  nodes: OrgNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (departmentId: string, newParentId: string | null) => void;
  /** 인원을 이 부서로 주 소속 이동 */
  onMemberDrop?: (memberId: string, departmentId: string) => void;
  /** 편집 모드: 하위 조직 빠른 추가 */
  onAddChild?: (parentId: string) => void;
  /** 편집 모드: 인라인 이름 변경 */
  onRename?: (departmentId: string, name: string) => void | Promise<void>;
  canManage: boolean;
  editMode?: boolean;
  searchQuery?: string;
  collapsedIds: ReadonlySet<string>;
  onToggleCollapse: (departmentId: string) => void;
  scrollToDepartmentId?: string | null;
  departmentMembers?: DepartmentMemberRow[];
  members?: DynamicMemberRow[];
  roles?: DynamicRoleRow[];
}

/**
 * 고밀도 세로 트리 내비 — 구조·인원 뱃지·멤버 드롭 타깃.
 */
export const DepartmentTreeView: React.FC<Props> = ({
  nodes,
  selectedId,
  onSelect,
  onMove,
  onMemberDrop,
  onAddChild,
  onRename,
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
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const allowDrag = canManage && editMode;
  const allowInlineEdit = canManage && editMode && Boolean(onRename);

  const commitRename = async (departmentId: string) => {
    const next = editingName.trim();
    setEditingId(null);
    if (!onRename || !next) return;
    const current = nodes.find((n) => n.id === departmentId);
    if (!current || current.name === next) return;
    await onRename(departmentId, next);
  };

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
    const padLeft = indentForDepth(depth);

    return children.map((node, index) => {
      const deptMembers = departmentMembers.filter((dm) => dm.department_id === node.id);
      const leadDm = deptMembers.find((dm) => dm.scope_type === 'DESCENDANTS');
      const leadMember = leadDm ? members.find((m) => m.id === leadDm.member_id) : null;
      const leadRole = leadDm?.custom_role_id
        ? roles.find((r) => r.id === leadDm.custom_role_id)?.name
        : null;
      const leadName = leadMember
        ? leadMember.name?.trim() || leadMember.email?.trim() || ORG_CHART_COPY.leader
        : null;
      const childNodes = childrenMap.get(node.id) ?? [];
      const hasChildren = childNodes.some((c) => !visibleIds || visibleIds.has(c.id));
      const isCollapsed = collapsedIds.has(node.id);
      const isDropTarget = dropTargetId === node.id;
      const isSelected = selectedId === node.id;
      const isLastSibling = index === children.length - 1;
      const guideX = padLeft - INDENT_PX / 2;

      return (
        <li key={node.id} className="list-none relative">
          {depth > 0 ? (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute top-0 w-px bg-slate-200"
                style={{
                  left: guideX,
                  bottom: isLastSibling ? 'auto' : 0,
                  height: isLastSibling ? 22 : undefined,
                }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute h-px bg-slate-200"
                style={{
                  left: guideX,
                  top: 22,
                  width: INDENT_PX / 2 - 2,
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
              if (canManage && onMemberDrop) {
                const types = Array.from(event.dataTransfer.types);
                if (types.includes(MEMBER_DRAG_MIME)) {
                  event.preventDefault();
                  setDropTargetId(node.id);
                  return;
                }
              }
              if (!allowDrag || !dragDeptId) return;
              if (dragDeptId === node.id) return;
              if (isDescendant(nodes, dragDeptId, node.id)) return;
              event.preventDefault();
              setDropTargetId(node.id);
            }}
            onDragLeave={() => {
              if (dropTargetId === node.id) setDropTargetId(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const memberId = event.dataTransfer.getData(MEMBER_DRAG_MIME);
              setDropTargetId(null);
              setDragDeptId(null);
              if (memberId && canManage && onMemberDrop) {
                onMemberDrop(memberId, node.id);
                return;
              }
              const droppedDept = event.dataTransfer.getData(DEPT_DRAG) || dragDeptId || '';
              if (droppedDept && droppedDept !== node.id && !isDescendant(nodes, droppedDept, node.id)) {
                onMove(droppedDept, node.id);
              }
            }}
            className={[
              'relative border-b border-slate-100 transition-colors',
              isSelected ? 'bg-slate-100' : isDropTarget ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50',
            ].join(' ')}
            style={{ paddingLeft: padLeft }}
          >
            {isSelected ? (
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-0.5 bg-slate-800"
              />
            ) : null}

            <div className="flex min-h-11 items-center gap-0.5 pr-2">
              {hasChildren ? (
                <button
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-slate-500 hover:text-slate-800"
                  aria-label={isCollapsed ? ORG_CHART_COPY.expandNode : ORG_CHART_COPY.collapseNode}
                  onClick={() => onToggleCollapse(node.id)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="inline-block h-11 w-11 shrink-0" aria-hidden />
              )}

              {editingId === node.id ? (
                <input
                  autoFocus
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-900"
                  value={editingName}
                  aria-label={ORG_CHART_COPY.renameInline}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => void commitRename(node.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void commitRename(node.id);
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setEditingId(null);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  type="button"
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 text-left"
                  onClick={() => onSelect(node.id)}
                  onDoubleClick={(e) => {
                    if (!allowInlineEdit) return;
                    e.preventDefault();
                    setEditingId(node.id);
                    setEditingName(node.name);
                  }}
                >
                  {node.unitKind ? (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {node.unitKind}
                    </span>
                  ) : null}
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                    {node.name}
                  </span>
                  <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500">
                    · {ORG_CHART_COPY.memberCount(deptMembers.length)}
                  </span>
                  {leadName ? (
                    <span className="min-w-0 truncate text-[11px] font-medium text-slate-500">
                      · {ORG_CHART_COPY.leader}{' '}
                      {leadRole ? `${leadRole} ` : ''}
                      {leadName}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[11px] font-semibold text-rose-600">
                      · {ORG_CHART_COPY.leaderMissing}
                    </span>
                  )}
                </button>
              )}

              {allowInlineEdit ? (
                <button
                  type="button"
                  className="inline-flex h-11 w-9 shrink-0 items-center justify-center text-slate-400 hover:text-slate-800"
                  aria-label={ORG_CHART_COPY.renameInline}
                  title={ORG_CHART_COPY.renameInline}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(node.id);
                    setEditingName(node.name);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {editMode && canManage && onAddChild ? (
                <button
                  type="button"
                  className="inline-flex h-11 w-9 shrink-0 items-center justify-center text-slate-400 hover:text-slate-800"
                  aria-label={ORG_CHART_COPY.addChild}
                  title={ORG_CHART_COPY.addChild}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(node.id);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : null}
              {allowDrag ? (
                <GripVertical
                  className="h-4 w-4 shrink-0 text-slate-300"
                  aria-hidden
                />
              ) : null}
            </div>
          </div>

          {!isCollapsed ? <ul role="group">{renderBranch(node.id, depth + 1)}</ul> : null}
        </li>
      );
    });
  };

  return (
    <div
      className="flex h-full min-h-[320px] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"
      data-testid="org-department-tree"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {ORG_CHART_COPY.treeHeading}
        </h2>
        {allowDrag ? (
          <span className="text-[11px] font-medium text-slate-500">{ORG_CHART_COPY.dragHint}</span>
        ) : null}
      </div>

      {allowDrag ? (
        <div
          className={`shrink-0 border-b border-dashed px-3 py-2 text-[11px] font-medium ${
            dropTargetId === '__root__'
              ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
              : 'border-slate-200 bg-slate-50 text-slate-500'
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

      <div className="min-h-0 flex-1 overflow-auto">
        <ul role="tree" className="m-0 p-0">
          {renderBranch(null, 0)}
        </ul>
        {nodes.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{ORG_CHART_COPY.emptyTree}</p>
        ) : null}
        {nodes.length > 0 && visibleIds && visibleIds.size === 0 ? (
          <p className="p-4 text-sm text-slate-500">{ORG_CHART_COPY.searchEmpty}</p>
        ) : null}
      </div>
    </div>
  );
};
