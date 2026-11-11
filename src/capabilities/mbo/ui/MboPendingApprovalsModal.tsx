import React from 'react';
import { X } from 'lucide-react';
import type { ObjectiveNode } from './MboObjectiveTreeViewer';
import { MBO_COPY } from './mboUiCopy';

export type PendingApprovalKind = 'new' | 'change';

export type PendingApprovalItem = {
  objective: ObjectiveNode;
  kind: PendingApprovalKind;
};

type Props = {
  open: boolean;
  items: PendingApprovalItem[];
  onClose: () => void;
  onOpenDetail: (id: string) => void;
};

export function classifyPendingApproval(
  objective: ObjectiveNode,
  goalsLocked: boolean,
): PendingApprovalKind {
  if (goalsLocked) return 'change';
  if (objective.rejectionReason?.trim()) return 'change';
  return 'new';
}

export const MboPendingApprovalsModal: React.FC<Props> = ({
  open,
  items,
  onClose,
  onOpenDetail,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      data-testid="mbo-pending-approvals-modal"
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">{MBO_COPY.pendingApprovalsTitle}</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-xl p-2 text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{MBO_COPY.pendingApprovalsEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {items.map(({ objective, kind }) => (
              <li key={objective.id}>
                <button
                  type="button"
                  className="flex min-h-12 w-full flex-col gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50"
                  onClick={() => {
                    onOpenDetail(objective.id);
                    onClose();
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        kind === 'change'
                          ? 'bg-amber-50 text-amber-900'
                          : 'bg-blue-50 text-blue-800'
                      }`}
                    >
                      {kind === 'change' ? MBO_COPY.pendingKindChange : MBO_COPY.pendingKindNew}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {objective.ownerName}
                    </span>
                  </div>
                  <span className="truncate text-xs font-bold text-slate-900">{objective.title}</span>
                  {kind === 'change' && objective.rejectionReason ? (
                    <span className="line-clamp-2 text-[11px] text-slate-600">
                      {objective.rejectionReason}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
