import React from 'react';
import { levelLabelKo } from '../domain/mboGoalHierarchy';
import type { AlignmentContext, AlignmentSlot } from '../domain/mboOrgAlignedTreeEngine';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  context: AlignmentContext;
  onSelectSlot?: (slot: AlignmentSlot) => void;
  onEmptyScopeAction?: () => void;
};

function Slot({
  slot,
  label,
  title,
  owner,
  count = 0,
  emptyHint,
  onSelect,
  onEmptyAction,
}: {
  slot: AlignmentSlot;
  label: string;
  title: string | null;
  owner?: string | null;
  count?: number;
  emptyHint?: string;
  onSelect?: (slot: AlignmentSlot) => void;
  onEmptyAction?: () => void;
}) {
  const hasItems = count > 0;
  const enabled = hasItems || Boolean(onEmptyAction);
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => {
        if (hasItems) onSelect?.(slot);
        else onEmptyAction?.();
      }}
      className={[
        'min-h-11 min-w-0 flex-1 border-b border-slate-200 px-1 py-2 text-left last:border-b-0',
        'enabled:hover:bg-slate-50 disabled:cursor-default sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-3',
      ].join(' ')}
      data-testid={`mbo-align-slot-${slot}`}
      aria-label={
        hasItems
          ? `${label}: ${title ?? ''}${count > 1 ? ` (${MBO_COPY.alignmentSlotCount(count)})` : ''}`
          : onEmptyAction
            ? `${label}: ${MBO_COPY.emptyGoalsSeeUpstream}`
            : `${label}: ${MBO_COPY.alignmentEmpty}`
      }
    >
      <div className="flex items-baseline justify-between gap-1">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        {count > 1 ? (
          <p className="shrink-0 text-[10px] font-semibold text-slate-600">
            {MBO_COPY.alignmentSlotCount(count)}
          </p>
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
        {title ?? MBO_COPY.alignmentEmpty}
      </p>
      {owner ? (
        <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">{owner}</p>
      ) : !hasItems && emptyHint ? (
        <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">{emptyHint}</p>
      ) : null}
    </button>
  );
}

export const MboAlignmentContextStrip: React.FC<Props> = ({
  context,
  onSelectSlot,
  onEmptyScopeAction,
}) => {
  return (
    <section
      className="border border-slate-200 bg-white"
      data-testid="mbo-alignment-strip"
      aria-label={MBO_COPY.alignmentCompany}
    >
      <div className="flex flex-col sm:flex-row">
        <Slot
          slot="company"
          label={MBO_COPY.alignmentCompany}
          title={context.company?.title ?? null}
          owner={
            context.company
              ? `${levelLabelKo(context.company.level)} · ${context.company.ownerName}`
              : null
          }
          count={context.companyCount}
          emptyHint={MBO_COPY.alignmentEmptyHint}
          onSelect={onSelectSlot}
          onEmptyAction={!context.company ? onEmptyScopeAction : undefined}
        />
        <Slot
          slot="department"
          label={MBO_COPY.alignmentDept}
          title={context.department?.title ?? null}
          owner={
            context.department
              ? `${context.department.departmentName || levelLabelKo('department')} · ${context.department.ownerName}`
              : null
          }
          count={context.departmentCount}
          emptyHint={MBO_COPY.alignmentEmptyHint}
          onSelect={onSelectSlot}
          onEmptyAction={!context.department ? onEmptyScopeAction : undefined}
        />
        <Slot
          slot="mine"
          label={MBO_COPY.alignmentMine}
          title={context.mine?.title ?? null}
          owner={
            context.mine
              ? `${levelLabelKo(context.mine.level)} · ${context.mine.ownerName}`
              : null
          }
          count={context.mineCount}
          emptyHint={MBO_COPY.alignmentEmptyHint}
          onSelect={onSelectSlot}
        />
      </div>
    </section>
  );
};
