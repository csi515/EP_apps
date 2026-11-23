import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
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
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={MBO_COPY.pendingApprovalsTitle}
      maxWidth="lg"
      footer={
        <div className="flex w-full justify-end">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      }
    >
      <div data-testid="mbo-pending-approvals-modal">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{MBO_COPY.pendingApprovalsEmpty}</p>
        ) : (
          <ul className="divide-y divide-slate-200 border border-slate-200">
            {items.map(({ objective, kind }) => (
              <li key={objective.id}>
                <button
                  type="button"
                  className="flex min-h-12 w-full flex-col gap-1 px-3 py-2.5 text-left hover:bg-slate-50"
                  onClick={() => {
                    onOpenDetail(objective.id);
                    onClose();
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                    <span className="text-slate-700">
                      {kind === 'change' ? MBO_COPY.pendingKindChange : MBO_COPY.pendingKindNew}
                    </span>
                    <span>·</span>
                    <span>{objective.ownerName}</span>
                  </div>
                  <span className="truncate text-sm font-medium text-slate-900">{objective.title}</span>
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
    </Modal>
  );
};
