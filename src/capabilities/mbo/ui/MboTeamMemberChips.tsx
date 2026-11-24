import React, { useCallback, useRef } from 'react';
import { Button } from '@/shared/components/ui/Button';
import type { TeamMemberChipModel } from '../domain/mboManagerDashboardEngine';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  chips: TeamMemberChipModel[];
  selectedUserIds: string[];
  onChangeSelected: (userIds: string[]) => void;
};

const DRAG_THRESHOLD_PX = 6;

export function MboTeamMemberChips({ chips, selectedUserIds, onChangeSelected }: Props) {
  const allSelected = selectedUserIds.length === 0;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    dragging: boolean;
  } | null>(null);

  const toggle = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChangeSelected(selectedUserIds.filter((id) => id !== userId));
      return;
    }
    onChangeSelected([...selectedUserIds, userId]);
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    didDragRef.current = false;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      dragging: false,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (!drag.dragging && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
    if (!drag.dragging) {
      drag.dragging = true;
      didDragRef.current = true;
      el.setPointerCapture(e.pointerId);
    }
    el.scrollLeft = drag.startScrollLeft - dx;
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.dragging && el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }, []);

  const suppressClickIfDragged = useCallback((e: React.MouseEvent) => {
    if (!didDragRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    didDragRef.current = false;
  }, []);

  return (
    <div className="space-y-1.5" data-testid="mbo-team-member-chips">
      <div
        ref={scrollerRef}
        className="flex cursor-grab gap-1.5 overflow-x-auto pb-1 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={suppressClickIfDragged}
      >
        <Button
          variant={allSelected ? 'primary' : 'outline'}
          size="sm"
          className={`shrink-0 ${allSelected ? '' : 'text-slate-900'}`}
          onClick={() => onChangeSelected([])}
        >
          {MBO_COPY.memberFilterAll}
        </Button>
        {chips.map((chip) => {
          const selected = !allSelected && selectedUserIds.includes(chip.userId);
          const titleParts = [
            `${chip.displayName} · 목표 ${chip.objectiveCount}건`,
            chip.pendingApproval ? '승인 대기' : null,
            chip.mboLocked ? '목표 확정' : null,
            !chip.weightValid ? MBO_COPY.weightChipWarn : null,
            chip.checkinOk ? null : MBO_COPY.chipReportMissing,
          ].filter(Boolean);
          return (
            <button
              key={chip.userId}
              type="button"
              title={titleParts.join(' · ')}
              className={[
                'inline-flex min-h-11 max-w-[200px] shrink-0 items-center gap-2 rounded-md border px-2.5 text-left text-xs font-semibold',
                selected
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : allSelected
                    ? 'border-slate-200 bg-white text-slate-700'
                    : 'border-slate-200 bg-white text-slate-400',
              ].join(' ')}
              onClick={() => toggle(chip.userId)}
            >
              <span className="min-w-0 flex-1 truncate">{chip.displayName}</span>
              <span
                className={`shrink-0 tabular-nums text-[10px] font-medium ${
                  selected ? 'text-slate-200' : 'text-slate-500'
                }`}
              >
                {chip.averageProgress}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
