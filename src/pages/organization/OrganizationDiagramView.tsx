import React, { useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import {
  buildDepartmentChildrenMap,
  memberDisplayLabel,
} from '@/core/organizations/orgChartPrimitives';
import type { DepartmentMemberRow, OrgNode } from './useOrganizationTree';
import { ORG_CHART_COPY } from './orgChartCopy';
import './organizationDiagram.css';

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
    return m ? memberDisplayLabel(m).toLowerCase().includes(q) : false;
  });
}

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

function depthTone(depth: number): string {
  if (depth === 0) return 'border-slate-800 bg-slate-800 text-white';
  if (depth === 1) return 'border-slate-600 bg-slate-600 text-white';
  if (depth === 2) return 'border-slate-400 bg-slate-200 text-slate-900';
  return 'border-slate-200 bg-white text-slate-900';
}

type Props = {
  nodes: OrgNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery?: string;
  collapsedIds: ReadonlySet<string>;
  onToggleCollapse: (departmentId: string) => void;
  scrollToDepartmentId?: string | null;
  departmentMembers?: DepartmentMemberRow[];
  members?: DynamicMemberRow[];
  roles?: DynamicRoleRow[];
};

export function OrganizationDiagramView({
  nodes,
  selectedId,
  onSelect,
  searchQuery = '',
  collapsedIds,
  onToggleCollapse,
  scrollToDepartmentId = null,
  departmentMembers = [],
  members = [],
  roles = [],
}: Props) {
  const childrenMap = useMemo(() => buildDepartmentChildrenMap(nodes), [nodes]);
  const visibleIds = useMemo(
    () => filterVisibleIds(nodes, departmentMembers, members, searchQuery),
    [nodes, departmentMembers, members, searchQuery],
  );

  useEffect(() => {
    if (!scrollToDepartmentId) return;
    const el = document.querySelector<HTMLElement>(
      `[data-diagram-dept-id="${CSS.escape(scrollToDepartmentId)}"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [scrollToDepartmentId]);

  const renderBranch = (parentId: string | null, depth: number): React.ReactNode => {
    const children = (childrenMap.get(parentId) ?? []).filter(
      (node) => !visibleIds || visibleIds.has(node.id),
    );
    if (children.length === 0) return null;

    return (
      <ul>
        {children.map((node) => {
          const deptMembers = departmentMembers.filter((dm) => dm.department_id === node.id);
          const leadDm = deptMembers.find((dm) => dm.scope_type === 'DESCENDANTS');
          const leadMember = leadDm ? members.find((m) => m.id === leadDm.member_id) : null;
          const leadRole = leadDm?.custom_role_id
            ? roles.find((r) => r.id === leadDm.custom_role_id)?.name
            : null;
          const leadName = leadMember
            ? leadMember.name?.trim() || leadMember.email?.trim() || null
            : null;
          const childList = childrenMap.get(node.id) ?? [];
          const hasChildren = childList.some((c) => !visibleIds || visibleIds.has(c.id));
          const isCollapsed = collapsedIds.has(node.id);
          const isSelected = selectedId === node.id;

          return (
            <li key={node.id}>
              <div
                className={[
                  'org-diagram-card w-[9.5rem] rounded-md border px-2 py-2 text-center shadow-sm',
                  depthTone(depth),
                  isSelected ? 'ring-2 ring-offset-1 ring-slate-900' : '',
                ].join(' ')}
                data-diagram-dept-id={node.id}
              >
                <div className="flex items-start justify-center gap-0.5">
                  {hasChildren ? (
                    <button
                      type="button"
                      className={[
                        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded',
                        depth <= 1 ? 'text-white/80 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100',
                      ].join(' ')}
                      aria-label={isCollapsed ? ORG_CHART_COPY.expandNode : ORG_CHART_COPY.collapseNode}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCollapse(node.id);
                      }}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : (
                    <span className="inline-block h-8 w-8 shrink-0" aria-hidden />
                  )}
                  <button
                    type="button"
                    className="min-h-11 min-w-0 flex-1 text-left"
                    onClick={() => onSelect(node.id)}
                  >
                    {node.unitKind ? (
                      <p
                        className={[
                          'truncate text-[10px] font-semibold uppercase tracking-wide',
                          depth <= 1 ? 'text-white/70' : 'text-slate-500',
                        ].join(' ')}
                      >
                        {node.unitKind}
                      </p>
                    ) : null}
                    <p className="truncate text-xs font-bold leading-snug">{node.name}</p>
                    <p
                      className={[
                        'mt-0.5 truncate text-[10px] font-medium',
                        depth <= 1 ? 'text-white/75' : 'text-slate-500',
                      ].join(' ')}
                    >
                      {ORG_CHART_COPY.memberCount(deptMembers.length)}
                      {leadName
                        ? ` · ${leadRole ? `${leadRole} ` : ''}${leadName}`
                        : ` · ${ORG_CHART_COPY.leaderMissing}`}
                    </p>
                  </button>
                </div>
              </div>
              {hasChildren && !isCollapsed ? renderBranch(node.id, depth + 1) : null}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div
      className="mbo-org-diagram flex h-full min-h-[360px] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
      data-testid="org-department-diagram"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {ORG_CHART_COPY.diagramHeading}
        </h2>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto p-4">
        {nodes.length === 0 ? (
          <p className="text-sm text-slate-500">{ORG_CHART_COPY.emptyTree}</p>
        ) : visibleIds && visibleIds.size === 0 ? (
          <p className="text-sm text-slate-500">{ORG_CHART_COPY.searchEmpty}</p>
        ) : (
          <div className="inline-block min-w-full">{renderBranch(null, 0)}</div>
        )}
      </div>
    </div>
  );
}
