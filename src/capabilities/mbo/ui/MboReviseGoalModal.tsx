import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FORM_CONTROL_CLASS, FormField } from '@/shared/components/ui/FormField';
import { Input } from '@/shared/components/ui/Input';
import type { MboLevel } from '../domain/mboEngine';
import {
  levelLabelKo,
  listEligibleParentGoals,
  type ExistingGoalRef,
} from '../domain/mboGoalHierarchy';
import { MboService } from '../services/mboService';
import { showToast } from '@/shared/feedback/uiFeedback';
import { MBO_COPY } from './mboUiCopy';

interface Props {
  open: boolean;
  goalId: string;
  organizationId?: string | null;
  goalLevel?: MboLevel | null;
  currentTargetValue?: string | number | null;
  currentDueDate?: string | null;
  currentWeight?: number | null;
  currentParentId?: string | null;
  existingGoalRefs?: readonly ExistingGoalRef[];
  objectiveTitlesById?: ReadonlyMap<string, string>;
  isManager?: boolean;
  bypassGoalCycleLock?: boolean;
  onClose: () => void;
  onRevised: () => void;
}

export const MboReviseGoalModal: React.FC<Props> = ({
  open,
  goalId,
  organizationId,
  goalLevel,
  currentTargetValue,
  currentDueDate,
  currentWeight,
  currentParentId,
  existingGoalRefs = [],
  objectiveTitlesById,
  isManager = false,
  bypassGoalCycleLock = false,
  onClose,
  onRevised,
}) => {
  const [targetValue, setTargetValue] = useState(
    currentTargetValue == null ? '' : String(currentTargetValue),
  );
  const [dueDate, setDueDate] = useState(currentDueDate ?? '');
  const [weight, setWeight] = useState(
    Number.isFinite(currentWeight) ? Number(currentWeight) : 100,
  );
  const [parentId, setParentId] = useState(currentParentId ?? '');
  const [unmetReason, setUnmetReason] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleParents = useMemo(() => {
    if (!goalLevel || goalLevel === 'company') return [];
    return listEligibleParentGoals(goalLevel, existingGoalRefs).filter((p) => p.id !== goalId);
  }, [goalLevel, existingGoalRefs, goalId]);

  useEffect(() => {
    if (!open) return;
    setTargetValue(currentTargetValue == null ? '' : String(currentTargetValue));
    setDueDate(currentDueDate ?? '');
    setWeight(Number.isFinite(currentWeight) ? Number(currentWeight) : 100);
    setParentId(currentParentId ?? '');
    setUnmetReason('');
    setRevisionReason('');
  }, [open, goalId, currentTargetValue, currentDueDate, currentWeight, currentParentId]);

  const dirty = Boolean(
    unmetReason || revisionReason || targetValue || dueDate || weight || parentId !== (currentParentId ?? ''),
  );

  const handleSubmit = () => {
    if (!unmetReason.trim() || !revisionReason.trim() || !dueDate) {
      showToast(MBO_COPY.reviseNeedFields, 'warning');
      return;
    }
    if (!targetValue.trim()) {
      showToast(MBO_COPY.reviseNeedTarget, 'warning');
      return;
    }
    const nextWeight = Math.min(100, Math.max(1, Math.round(weight)));
    if (!Number.isFinite(nextWeight)) {
      showToast(MBO_COPY.weightSaveFailed, 'warning');
      return;
    }
    setBusy(true);
    void MboService.reviseGoal({
      goalId,
      newTargetValue: targetValue.trim(),
      newDueDate: dueDate,
      unmetReason: unmetReason.trim(),
      revisionReason: revisionReason.trim(),
    })
      .then(async () => {
        if (organizationId) {
          await MboService.updateObjective(
            goalId,
            organizationId,
            {
              weight: nextWeight,
              parent_id: goalLevel === 'company' ? null : parentId || null,
            },
            { isManager, bypassGoalCycleLock },
          );
        }
        showToast(MBO_COPY.reviseSuccess, 'success');
        onRevised();
        onClose();
      })
      .catch((cause) => {
        showToast(cause instanceof Error ? cause.message : MBO_COPY.reviseFailed, 'error');
      })
      .finally(() => setBusy(false));
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={MBO_COPY.reviseModalTitle}
      maxWidth="lg"
      intent="form"
      dirty={dirty}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" isLoading={busy} onClick={handleSubmit}>
            {MBO_COPY.reviseConfirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <FormField label={MBO_COPY.reviseTargetLabel} htmlFor="mbo-revise-target">
          <input
            id="mbo-revise-target"
            className={FORM_CONTROL_CLASS}
            type="text"
            value={targetValue}
            onChange={(event) => setTargetValue(event.target.value)}
            placeholder={MBO_COPY.reviseTargetPlaceholder}
            required
          />
        </FormField>
        <FormField label={MBO_COPY.weightLabel} htmlFor="mbo-revise-weight">
          <Input
            id="mbo-revise-weight"
            type="number"
            min={1}
            max={100}
            value={weight}
            onChange={(event) => setWeight(Number(event.target.value))}
            inputSize="md"
            data-testid="mbo-revise-objective-weight"
          />
        </FormField>
        {goalLevel && goalLevel !== 'company' ? (
          <FormField
            label={MBO_COPY.parentGoalLabel}
            htmlFor="mbo-revise-parent"
            hint={MBO_COPY.parentGoalHint}
          >
            <select
              id="mbo-revise-parent"
              className={FORM_CONTROL_CLASS}
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              data-testid="mbo-revise-objective-parent"
            >
              <option value="">{MBO_COPY.parentGoalNone}</option>
              {eligibleParents.map((parent) => {
                const title = objectiveTitlesById?.get(parent.id) ?? parent.id;
                return (
                  <option key={parent.id} value={parent.id}>
                    [{levelLabelKo(parent.level)}] {title}
                  </option>
                );
              })}
            </select>
          </FormField>
        ) : null}
        <FormField label={MBO_COPY.reviseDueLabel} htmlFor="mbo-revise-due">
          <input
            id="mbo-revise-due"
            className={FORM_CONTROL_CLASS}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </FormField>
        <FormField label={MBO_COPY.reviseUnmetLabel} htmlFor="mbo-revise-unmet">
          <textarea
            id="mbo-revise-unmet"
            className={`${FORM_CONTROL_CLASS} min-h-24 resize-none`}
            value={unmetReason}
            onChange={(event) => setUnmetReason(event.target.value)}
            required
          />
        </FormField>
        <FormField label={MBO_COPY.reviseReasonLabel} htmlFor="mbo-revise-reason">
          <textarea
            id="mbo-revise-reason"
            className={`${FORM_CONTROL_CLASS} min-h-24 resize-none`}
            value={revisionReason}
            onChange={(event) => setRevisionReason(event.target.value)}
            required
          />
        </FormField>
      </div>
    </Modal>
  );
};
