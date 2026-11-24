import React from 'react';
import type { DepartmentScopeType } from '@/core/organizations/departmentScope';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import type { DepartmentMemberRow } from './useOrganizationTree';
import { ORG_CHART_COPY } from './orgChartCopy';
import { MEMBER_DRAG_MIME } from './orgMemberDrag';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';

function memberLabel(member: DynamicMemberRow): string {
  if (member.name?.trim()) return member.name.trim();
  if (member.email?.trim()) return member.email.trim();
  return `${member.user_id.slice(0, 8)}…`;
}

function initials(member: DynamicMemberRow): string {
  const label = memberLabel(member);
  return label.slice(0, 2).toUpperCase();
}

type Props = {
  member: DynamicMemberRow;
  placement: DepartmentMemberRow;
  roles: DynamicRoleRow[];
  selected: boolean;
  canEdit: boolean;
  onToggleSelect: (memberId: string) => void;
  onScopeChange: (scope: DepartmentScopeType) => void;
  onRoleChange: (roleId: string | null) => void;
};

export function OrgMemberRow({
  member,
  placement,
  roles,
  selected,
  canEdit,
  onToggleSelect,
  onScopeChange,
  onRoleChange,
}: Props) {
  const inactive = member.is_active === false;

  return (
    <li
      className={[
        'flex min-h-11 w-full min-w-[22rem] items-center gap-2 border-b border-slate-100 px-2 py-1.5',
        selected ? 'bg-slate-100' : 'bg-white hover:bg-slate-50',
        inactive ? 'opacity-60' : '',
      ].join(' ')}
      draggable={canEdit}
      onDragStart={(e) => {
        if (!canEdit) return;
        e.dataTransfer.setData(MEMBER_DRAG_MIME, member.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0"
        checked={selected}
        onChange={() => onToggleSelect(member.id)}
        aria-label={memberLabel(member)}
        disabled={!canEdit}
      />
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700"
        aria-hidden
      >
        {initials(member)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{memberLabel(member)}</p>
        {inactive ? (
          <p className="text-[10px] font-semibold text-slate-500">비활성</p>
        ) : null}
      </div>
      {canEdit ? (
        <>
          <select
            className={`${FORM_CONTROL_CLASS} h-9 w-[6.5rem] shrink-0 py-0 text-xs`}
            value={placement.scope_type}
            onChange={(e) => onScopeChange(e.target.value as DepartmentScopeType)}
            aria-label={ORG_CHART_COPY.scope}
          >
            <option value="SELF_ONLY">{ORG_CHART_COPY.scopeMember}</option>
            <option value="DESCENDANTS">{ORG_CHART_COPY.scopeLeader}</option>
            <option value="GLOBAL">{ORG_CHART_COPY.scopeGlobal}</option>
          </select>
          <select
            className={`${FORM_CONTROL_CLASS} h-9 w-[6.5rem] shrink-0 py-0 text-xs`}
            value={placement.custom_role_id ?? ''}
            onChange={(e) => onRoleChange(e.target.value || null)}
            aria-label={ORG_CHART_COPY.roleLabel}
          >
            <option value="">{ORG_CHART_COPY.roleNone}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </>
      ) : (
        <span className="shrink-0 text-[11px] font-medium text-slate-500">
          {placement.scope_type === 'DESCENDANTS'
            ? ORG_CHART_COPY.scopeLeader
            : ORG_CHART_COPY.scopeMember}
        </span>
      )}
    </li>
  );
}
