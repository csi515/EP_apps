import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import type { OrgNode } from './useOrganizationTree';
import { ORG_CHART_COPY } from './orgChartCopy';

type Props = {
  selectedCount: number;
  nodes: OrgNode[];
  onClear: () => void;
  onMove: (departmentId: string) => void | Promise<void>;
};

export function OrgBulkMoveBar({ selectedCount, nodes, onClear, onMove }: Props) {
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);
  if (selectedCount <= 0) return null;

  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2"
      data-testid="org-bulk-move-bar"
    >
      <span className="shrink-0 text-xs font-bold text-slate-800">
        {ORG_CHART_COPY.selectedCount(selectedCount)}
      </span>
      <select
        className={`${FORM_CONTROL_CLASS} h-10 min-w-0 max-w-full flex-1 basis-[12rem] py-0 text-xs`}
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        aria-label={ORG_CHART_COPY.bulkMovePick}
      >
        <option value="">{ORG_CHART_COPY.bulkMovePick}</option>
        {[...nodes]
          .sort((a, b) => a.path.localeCompare(b.path))
          .map((n) => (
            <option key={n.id} value={n.id}>
              {n.unitKind ? `${n.unitKind} · ` : ''}
              {n.name}
            </option>
          ))}
      </select>
      <Button
        type="button"
        size="sm"
        disabled={!targetId || busy}
        isLoading={busy}
        onClick={() => {
          if (!targetId) return;
          setBusy(true);
          void Promise.resolve(onMove(targetId)).finally(() => setBusy(false));
        }}
      >
        {ORG_CHART_COPY.bulkMove}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        {ORG_CHART_COPY.clearSelection}
      </Button>
    </div>
  );
}
