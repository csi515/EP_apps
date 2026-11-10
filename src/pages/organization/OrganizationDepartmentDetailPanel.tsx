import React, { useEffect, useState } from 'react';
import { DEPARTMENT_UNIT_KIND_SUGGESTIONS } from '@/core/organizations/services/organizationTreeService';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import type { DepartmentMemberRow, OrgNode } from './useOrganizationTree';
import { OrganizationGovernancePanel, SCOPE_LABELS } from './OrganizationGovernancePanel';
import { ORG_CHART_COPY } from './orgChartCopy';

function memberLabel(member: DynamicMemberRow): string {
  if (member.name?.trim()) return member.name.trim();
  if (member.email?.trim()) return member.email.trim();
  return `${member.user_id.slice(0, 8)}…`;
}

type Props = {
  node: OrgNode | null;
  canManage: boolean;
  departmentMembers: DepartmentMemberRow[];
  members: DynamicMemberRow[];
  roles: DynamicRoleRow[];
  nodes: OrgNode[];
  onRename: (id: string, name: string, unitKind: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAssignScope: (input: {
    departmentId: string;
    memberId: string;
    scopeType: import('@/core/organizations/departmentScope').DepartmentScopeType;
    customRoleId?: string | null;
  }) => Promise<void>;
  onRevokeRole: (memberId: string) => Promise<void>;
};

export function OrganizationDepartmentDetailPanel({
  node,
  canManage,
  departmentMembers,
  members,
  roles,
  nodes,
  onRename,
  onDelete,
  onAssignScope,
  onRevokeRole,
}: Props) {
  const [editName, setEditName] = useState('');
  const [editUnitKind, setEditUnitKind] = useState('');
  const [showPlacement, setShowPlacement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEditName(node?.name ?? '');
    setEditUnitKind(node?.unitKind ?? '');
    setShowPlacement(false);
    setError(null);
  }, [node?.id, node?.name, node?.unitKind]);

  if (!node) {
    return (
      <aside
        className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500"
        data-testid="org-dept-detail-empty"
      >
        {ORG_CHART_COPY.emptySelection}
      </aside>
    );
  }

  const rows = departmentMembers.filter((dm) => dm.department_id === node.id);
  const lead = rows.find((dm) => dm.scope_type === 'DESCENDANTS');
  const leadMember = lead ? members.find((m) => m.id === lead.member_id) : null;

  return (
    <aside
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"
      data-testid="org-dept-detail"
      aria-label={ORG_CHART_COPY.detailTitle}
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {ORG_CHART_COPY.detailTitle}
        </p>
        <h2 className="mt-1 text-base font-extrabold text-slate-900">{node.name}</h2>
        {node.unitKind ? (
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{node.unitKind}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
        {leadMember ? (
          <span>
            {ORG_CHART_COPY.leader} · {memberLabel(leadMember)}
          </span>
        ) : (
          <span className="text-rose-700">{ORG_CHART_COPY.leaderMissing}</span>
        )}
        <span className="ml-2 text-slate-500">
          · {ORG_CHART_COPY.memberCount(rows.length)}
        </span>
      </div>

      <ul className="space-y-1.5">
        {rows.map((row) => {
          const member = members.find((m) => m.id === row.member_id);
          const roleName = roles.find((r) => r.id === row.custom_role_id)?.name;
          return (
            <li
              key={row.id}
              className="flex min-h-10 items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 text-xs font-semibold text-slate-700"
            >
              <span className="truncate">{member ? memberLabel(member) : row.member_id.slice(0, 8)}</span>
              <span className="shrink-0 text-[10px] text-slate-500">
                {SCOPE_LABELS[row.scope_type]?.title ?? row.scope_type}
                {roleName ? ` · ${roleName}` : ''}
              </span>
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className="text-xs text-slate-400">아직 배치된 구성원이 없습니다.</li>
        ) : null}
      </ul>

      {canManage ? (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
          <label className="block text-xs font-bold text-slate-700">
            {ORG_CHART_COPY.name}
            <input
              className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            {ORG_CHART_COPY.unitKind}
            <input
              className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
              list="org-detail-unit-kind"
              value={editUnitKind}
              onChange={(e) => setEditUnitKind(e.target.value)}
            />
            <datalist id="org-detail-unit-kind">
              {DEPARTMENT_UNIT_KIND_SUGGESTIONS.map((kind) => (
                <option key={kind} value={kind} />
              ))}
            </datalist>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !editName.trim()}
              className="min-h-12 flex-1 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-40"
              onClick={() => {
                setBusy(true);
                setError(null);
                void onRename(node.id, editName.trim(), editUnitKind.trim() || null)
                  .catch((cause) => {
                    setError(cause instanceof Error ? cause.message : '저장 실패');
                  })
                  .finally(() => setBusy(false));
              }}
            >
              {ORG_CHART_COPY.save}
            </button>
            <button
              type="button"
              disabled={busy}
              className="min-h-12 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-700"
              onClick={() => {
                if (!window.confirm(`‘${node.name}’ 조직을 삭제할까요?`)) return;
                setBusy(true);
                setError(null);
                void onDelete(node.id)
                  .catch((cause) => {
                    setError(cause instanceof Error ? cause.message : '삭제 실패');
                  })
                  .finally(() => setBusy(false));
              }}
            >
              {ORG_CHART_COPY.delete}
            </button>
          </div>

          <button
            type="button"
            className="min-h-12 w-full rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
            onClick={() => setShowPlacement((v) => !v)}
          >
            {showPlacement ? '인원 배치 닫기' : ORG_CHART_COPY.placePeople}
          </button>

          {showPlacement ? (
            <OrganizationGovernancePanel
              canManage={canManage}
              nodes={nodes}
              members={members}
              departmentMembers={departmentMembers}
              roles={roles}
              selectedDepartmentId={node.id}
              compact
              onAssignScope={onAssignScope}
              onRevokeRole={onRevokeRole}
            />
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
