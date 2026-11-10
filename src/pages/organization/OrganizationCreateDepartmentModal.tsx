import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { DEPARTMENT_UNIT_KIND_SUGGESTIONS } from '@/core/organizations/services/organizationTreeService';
import type { OrgNode } from './useOrganizationTree';
import { ORG_CHART_COPY } from './orgChartCopy';

type Props = {
  open: boolean;
  nodes: OrgNode[];
  defaultParentId?: string | null;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    parentId: string | null;
    unitKind: string | null;
  }) => Promise<void>;
};

export function OrganizationCreateDepartmentModal({
  open,
  nodes,
  defaultParentId = null,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState('');
  const [unitKind, setUnitKind] = useState('');
  const [parentId, setParentId] = useState(defaultParentId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName('');
    setUnitKind('');
    setParentId(defaultParentId ?? '');
    setError(null);
  }, [open, defaultParentId]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={ORG_CHART_COPY.createTitle}
      maxWidth="md"
      intent="form"
      description="조직도에 새 단위를 추가합니다."
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="min-h-12 rounded-xl px-4 text-sm font-semibold text-slate-600"
            onClick={onClose}
          >
            {ORG_CHART_COPY.cancel}
          </button>
          <button
            type="button"
            disabled={busy || !name.trim()}
            className="min-h-12 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-40"
            onClick={() => {
              setBusy(true);
              setError(null);
              void onCreate({
                name: name.trim(),
                parentId: parentId || null,
                unitKind: unitKind.trim() || null,
              })
                .then(() => onClose())
                .catch((cause) => {
                  setError(cause instanceof Error ? cause.message : '조직 추가에 실패했습니다.');
                })
                .finally(() => setBusy(false));
            }}
          >
            {ORG_CHART_COPY.createSubmit}
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        <label className="block font-semibold text-slate-700">
          {ORG_CHART_COPY.name}
          <input
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 px-3 font-semibold"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <label className="block font-semibold text-slate-700">
          {ORG_CHART_COPY.unitKind}
          <input
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 px-3"
            list="org-create-unit-kind"
            placeholder={ORG_CHART_COPY.unitKindHint}
            value={unitKind}
            onChange={(e) => setUnitKind(e.target.value)}
          />
          <datalist id="org-create-unit-kind">
            {DEPARTMENT_UNIT_KIND_SUGGESTIONS.map((kind) => (
              <option key={kind} value={kind} />
            ))}
          </datalist>
        </label>
        <label className="block font-semibold text-slate-700">
          {ORG_CHART_COPY.parent}
          <select
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 px-3"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">{ORG_CHART_COPY.parentRoot}</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.unitKind ? `[${node.unitKind}] ` : ''}
                {node.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  );
}
