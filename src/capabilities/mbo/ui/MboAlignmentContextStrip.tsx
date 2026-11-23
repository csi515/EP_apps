import React from 'react';
import { levelLabelKo } from '../domain/mboGoalHierarchy';
import type { AlignmentContext } from '../domain/mboOrgAlignedTreeEngine';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  context: AlignmentContext;
  onSelectObjective?: (id: string) => void;
};

function Slot({
  label,
  title,
  owner,
  id,
  emptyHint,
  onSelect,
}: {
  label: string;
  title: string | null;
  owner?: string | null;
  id?: string | null;
  emptyHint?: string;
  onSelect?: (id: string) => void;
}) {
  const enabled = Boolean(id);
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => id && onSelect?.(id)}
      className="min-h-11 min-w-0 flex-1 border-b border-slate-200 px-1 py-2 text-left last:border-b-0 enabled:hover:bg-slate-50 disabled:cursor-default sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-3"
      data-testid={`mbo-align-slot-${label}`}
      aria-label={enabled ? `${label}: ${title}` : `${label}: ${MBO_COPY.alignmentEmpty}`}
    >
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
        {title ?? MBO_COPY.alignmentEmpty}
      </p>
      {owner ? (
        <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">{owner}</p>
      ) : !enabled && emptyHint ? (
        <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">{emptyHint}</p>
      ) : null}
    </button>
  );
}

export const MboAlignmentContextStrip: React.FC<Props> = ({
  context,
  onSelectObjective,
}) => {
  return (
    <section
      className="border border-slate-200 bg-white"
      data-testid="mbo-alignment-strip"
      aria-label={MBO_COPY.alignmentStripTitle}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-slate-200 px-3 py-2">
        <p className="text-[11px] font-semibold text-slate-700">{MBO_COPY.alignmentStripTitle}</p>
        <p className="text-[10px] font-medium text-slate-500">{MBO_COPY.alignmentStripHint}</p>
      </div>
      <div className="flex flex-col sm:flex-row">
        <Slot
          label={MBO_COPY.alignmentCompany}
          title={context.company?.title ?? null}
          owner={
            context.company
              ? `${levelLabelKo(context.company.level)} · ${context.company.ownerName}`
              : null
          }
          id={context.company?.id}
          emptyHint={MBO_COPY.alignmentEmptyHint}
          onSelect={onSelectObjective}
        />
        <Slot
          label={MBO_COPY.alignmentDept}
          title={context.department?.title ?? null}
          owner={
            context.department
              ? `${context.department.departmentName || levelLabelKo('department')} · ${context.department.ownerName}`
              : null
          }
          id={context.department?.id}
          emptyHint={MBO_COPY.alignmentEmptyHint}
          onSelect={onSelectObjective}
        />
        <Slot
          label={MBO_COPY.alignmentMine}
          title={context.mine?.title ?? null}
          owner={
            context.mine
              ? `${levelLabelKo(context.mine.level)} · ${context.mine.ownerName}`
              : null
          }
          id={context.mine?.id}
          emptyHint={MBO_COPY.alignmentEmptyHint}
          onSelect={onSelectObjective}
        />
      </div>
    </section>
  );
};
