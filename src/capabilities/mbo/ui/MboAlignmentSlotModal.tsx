import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { levelLabelKo } from '../domain/mboGoalHierarchy';
import {
  listAlignmentSlotRows,
  type AlignmentContext,
  type AlignmentSlot,
} from '../domain/mboOrgAlignedTreeEngine';
import { MBO_COPY } from './mboUiCopy';
import { mboStatusDotClass } from './mboStatusVisual';

type Props = {
  slot: AlignmentSlot | null;
  context: AlignmentContext;
  onClose: () => void;
  onOpenDetail: (objectiveId: string) => void;
};

function slotTitle(slot: AlignmentSlot): string {
  if (slot === 'company') return MBO_COPY.alignmentFocusCompany;
  if (slot === 'department') return MBO_COPY.alignmentFocusDept;
  return MBO_COPY.alignmentFocusMine;
}

export function MboAlignmentSlotModal({ slot, context, onClose, onOpenDetail }: Props) {
  const open = Boolean(slot);
  const rows = slot ? listAlignmentSlotRows(context, slot) : [];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={slot ? slotTitle(slot) : ''}
      description={slot ? MBO_COPY.alignmentSlotCount(rows.length) : undefined}
      maxWidth="lg"
      intent="view"
      footer={
        <div className="flex w-full justify-end">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      }
    >
      <div data-testid="mbo-alignment-slot-modal">
        {rows.length === 0 ? (
          <EmptyState title={MBO_COPY.alignmentEmpty} description={MBO_COPY.alignmentEmptyHint} />
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 bg-white">
            {rows.map((obj) => (
              <li key={obj.id} className="flex min-h-12 items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => {
                    onOpenDetail(obj.id);
                    onClose();
                  }}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${mboStatusDotClass(obj.status)}`}
                    aria-hidden
                  />
                  <span className="shrink-0 text-[10px] font-medium text-slate-500">
                    {levelLabelKo(obj.level)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                    {obj.title}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium text-slate-500">
                    {obj.ownerName} · {obj.progressRate}%
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-md"
                  aria-label={MBO_COPY.openDetail}
                  onClick={() => {
                    onOpenDetail(obj.id);
                    onClose();
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
