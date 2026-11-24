import React, { useMemo } from 'react';
import type { DepartmentScopeType } from '@/core/organizations/departmentScope';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import type { DepartmentMemberRow, OrgNode } from './useOrganizationTree';
import { OrgBulkMoveBar } from './OrgBulkMoveBar';
import { OrgMemberRow } from './OrgMemberRow';
import { ORG_CHART_COPY } from './orgChartCopy';
import { Button } from '@/shared/components/ui/Button';

type Props = {
  node: OrgNode | null;
  nodes: OrgNode[];
  members: DynamicMemberRow[];
  departmentMembers: DepartmentMemberRow[];
  roles: DynamicRoleRow[];
  canEdit: boolean;
  selectedMemberIds: ReadonlySet<string>;
  onToggleSelect: (memberId: string) => void;
  onClearSelection: () => void;
  onSelectDepartment: (id: string) => void;
  onBulkMove: (departmentId: string) => void | Promise<void>;
  onScopeChange: (
    memberId: string,
    departmentId: string,
    scope: DepartmentScopeType,
    roleId: string | null,
  ) => void | Promise<void>;
  onRequestDelete?: () => void;
};

export function OrgDepartmentBoard({
  node,
  nodes,
  members,
  departmentMembers,
  roles,
  canEdit,
  selectedMemberIds,
  onToggleSelect,
  onClearSelection,
  onSelectDepartment,
  onBulkMove,
  onScopeChange,
  onRequestDelete,
}: Props) {
  const children = useMemo(
    () => (node ? nodes.filter((n) => n.parentId === node.id) : []),
    [node, nodes],
  );
  const placements = useMemo(
    () => (node ? departmentMembers.filter((dm) => dm.department_id === node.id) : []),
    [node, departmentMembers],
  );
  const rows = useMemo(() => {
    return placements
      .map((p) => {
        const member = members.find((m) => m.id === p.member_id);
        return member ? { placement: p, member } : null;
      })
      .filter(Boolean) as Array<{ placement: DepartmentMemberRow; member: DynamicMemberRow }>;
  }, [placements, members]);

  if (!node) {
    return (
      <div
        className="flex h-full w-full min-w-0 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500"
        data-testid="org-department-board-empty"
      >
        {ORG_CHART_COPY.emptySelection}
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"
      data-testid="org-department-board"
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {ORG_CHART_COPY.boardHeading}
          </p>
          <h2 className="truncate text-sm font-bold text-slate-900">
            {node.unitKind ? `${node.unitKind} · ` : ''}
            {node.name}
          </h2>
          <p className="text-[11px] font-medium text-slate-500">
            {ORG_CHART_COPY.memberCount(rows.length)}
          </p>
        </div>
        {canEdit && onRequestDelete ? (
          <Button type="button" variant="outline" size="sm" onClick={onRequestDelete}>
            {ORG_CHART_COPY.delete}
          </Button>
        ) : null}
      </div>

      <OrgBulkMoveBar
        selectedCount={selectedMemberIds.size}
        nodes={nodes}
        onClear={onClearSelection}
        onMove={onBulkMove}
      />

      {children.length > 0 ? (
        <div className="shrink-0 border-b border-slate-100 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {ORG_CHART_COPY.childDepartments}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {children.map((c) => {
              const count = departmentMembers.filter((dm) => dm.department_id === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-left text-xs font-semibold text-slate-800 hover:border-slate-300"
                  onClick={() => onSelectDepartment(c.id)}
                >
                  {c.unitKind ? `${c.unitKind} · ` : ''}
                  {c.name}
                  <span className="ml-1 text-[10px] font-medium text-slate-500">
                    {ORG_CHART_COPY.memberCount(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto">
        <p className="sticky top-0 z-[1] border-b border-slate-100 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {ORG_CHART_COPY.membersInDept}
        </p>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{ORG_CHART_COPY.noMembersInDept}</p>
        ) : (
          <ul className="m-0 min-w-full list-none p-0">
            {rows.map(({ member, placement }) => (
              <OrgMemberRow
                key={placement.id}
                member={member}
                placement={placement}
                roles={roles}
                selected={selectedMemberIds.has(member.id)}
                canEdit={canEdit}
                onToggleSelect={onToggleSelect}
                onScopeChange={(scope) => {
                  void onScopeChange(
                    member.id,
                    node.id,
                    scope,
                    placement.custom_role_id,
                  );
                }}
                onRoleChange={(roleId) => {
                  void onScopeChange(member.id, node.id, placement.scope_type, roleId);
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
