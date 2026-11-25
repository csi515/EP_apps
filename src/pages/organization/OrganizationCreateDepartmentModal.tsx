import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
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
      description={ORG_CHART_COPY.createDescription}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {ORG_CHART_COPY.cancel}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!name.trim()}
            isLoading={busy}
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
                  setError(
                    cause instanceof Error ? cause.message : ORG_CHART_COPY.createFailed,
                  );
                })
                .finally(() => setBusy(false));
            }}
          >
            {ORG_CHART_COPY.createSubmit}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        <FormField label={ORG_CHART_COPY.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </FormField>
        <FormField label={ORG_CHART_COPY.unitKind} hint={ORG_CHART_COPY.unitKindHint}>
          <Input
            value={unitKind}
            onChange={(e) => setUnitKind(e.target.value)}
            autoComplete="off"
          />
        </FormField>
        <FormField label={ORG_CHART_COPY.parent}>
          <select
            className={FORM_CONTROL_CLASS}
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
        </FormField>
      </div>
    </Modal>
  );
}
