import React from 'react';
import { X } from 'lucide-react';
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import { Button } from '@/shared/components/ui/Button';
import { ORG_CHART_COPY } from './orgChartCopy';
import { MEMBER_DRAG_MIME } from './orgMemberDrag';

function memberLabel(member: DynamicMemberRow): string {
  if (member.name?.trim()) return member.name.trim();
  if (member.email?.trim()) return member.email.trim();
  return `${member.user_id.slice(0, 8)}…`;
}

function initials(member: DynamicMemberRow): string {
  return memberLabel(member).slice(0, 2).toUpperCase();
}

type Props = {
  open: boolean;
  members: DynamicMemberRow[];
  canEdit: boolean;
  selectedMemberIds: ReadonlySet<string>;
  onClose: () => void;
  onToggleSelect: (memberId: string) => void;
};

export function OrgUnassignedDrawer({
  open,
  members,
  canEdit,
  selectedMemberIds,
  onClose,
  onToggleSelect,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 max-h-[45vh] border-t border-slate-200 bg-white shadow-lg sm:inset-x-auto sm:bottom-3 sm:right-3 sm:w-[22rem] sm:max-h-[70vh] sm:rounded-lg sm:border"
      data-testid="org-unassigned-drawer"
      role="dialog"
      aria-label={ORG_CHART_COPY.unassignedTitle}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{ORG_CHART_COPY.unassignedTitle}</h2>
          <p className="text-[11px] font-medium text-slate-500">
            {ORG_CHART_COPY.unassignedCount(members.length)}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label={ORG_CHART_COPY.closeUnassigned}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="border-b border-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
        {ORG_CHART_COPY.unassignedHint}
      </p>
      <ul className="m-0 max-h-[calc(45vh-5rem)] list-none overflow-auto p-0 sm:max-h-[calc(70vh-5rem)]">
        {members.length === 0 ? (
          <li className="p-4 text-sm text-slate-500">{ORG_CHART_COPY.unassignedEmpty}</li>
        ) : (
          members.map((m) => {
            const selected = selectedMemberIds.has(m.id);
            return (
              <li
                key={m.id}
                className={[
                  'flex min-h-11 items-center gap-2 border-b border-slate-100 px-3 py-1.5',
                  selected ? 'bg-slate-100' : 'hover:bg-slate-50',
                ].join(' ')}
                draggable={canEdit}
                onDragStart={(e) => {
                  if (!canEdit) return;
                  e.dataTransfer.setData(MEMBER_DRAG_MIME, m.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selected}
                  disabled={!canEdit}
                  onChange={() => onToggleSelect(m.id)}
                  aria-label={memberLabel(m)}
                />
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-900">
                  {initials(m)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                  {memberLabel(m)}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
