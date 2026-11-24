import React, { useEffect, useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import type { OrgNode } from './useOrganizationTree';
import { ORG_CHART_COPY } from './orgChartCopy';

type Props = {
  open: boolean;
  node: OrgNode | null;
  nodes: OrgNode[];
  memberCount: number;
  childCount: number;
  onClose: () => void;
  onConfirm: (input: {
    memberAction: 'reassign' | 'unassign';
    targetParentId: string | null;
  }) => void | Promise<void>;
};

export function OrgDeleteDepartmentDialog({
  open,
  node,
  nodes,
  memberCount,
  childCount,
  onClose,
  onConfirm,
}: Props) {
  const [memberAction, setMemberAction] = useState<'reassign' | 'unassign'>('reassign');
  const [targetParentId, setTargetParentId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !node) return;
    setMemberAction(memberCount > 0 ? 'reassign' : 'unassign');
    setTargetParentId(node.parentId ?? '');
  }, [open, node, memberCount]);

  if (!node) return null;

  const transferOptions = nodes.filter(
    (n) => n.id !== node.id && !n.path.startsWith(node.path),
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={ORG_CHART_COPY.deleteTitle}
      maxWidth="md"
      intent="form"
      description={`${node.unitKind ? `${node.unitKind} · ` : ''}${node.name}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {ORG_CHART_COPY.cancel}
          </Button>
          <Button
            type="button"
            variant="primary"
            isLoading={busy}
            onClick={() => {
              setBusy(true);
              void Promise.resolve(
                onConfirm({
                  memberAction,
                  targetParentId: targetParentId || null,
                }),
              ).finally(() => setBusy(false));
            }}
          >
            {ORG_CHART_COPY.deleteConfirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm" data-testid="org-delete-department-dialog">
        {childCount > 0 ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
            {ORG_CHART_COPY.deleteHasChildren}
          </p>
        ) : null}
        {memberCount > 0 ? (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
            {ORG_CHART_COPY.deleteHasMembers}
          </p>
        ) : null}

        <label className="block text-xs font-bold text-slate-700">
          {ORG_CHART_COPY.deleteTargetParent}
          <select
            className={`${FORM_CONTROL_CLASS} mt-1`}
            value={targetParentId}
            onChange={(e) => setTargetParentId(e.target.value)}
          >
            <option value="">{ORG_CHART_COPY.parentRoot}</option>
            {transferOptions
              .sort((a, b) => a.path.localeCompare(b.path))
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.unitKind ? `${n.unitKind} · ` : ''}
                  {n.name}
                </option>
              ))}
          </select>
        </label>

        {memberCount > 0 ? (
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-slate-700">인원 처리</legend>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="member-action"
                checked={memberAction === 'reassign'}
                onChange={() => setMemberAction('reassign')}
              />
              {ORG_CHART_COPY.deleteTransfer}
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="member-action"
                checked={memberAction === 'unassign'}
                onChange={() => setMemberAction('unassign')}
              />
              {ORG_CHART_COPY.deleteUnassign}
            </label>
          </fieldset>
        ) : null}
      </div>
    </Modal>
  );
}
