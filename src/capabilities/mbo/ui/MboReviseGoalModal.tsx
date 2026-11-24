import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FORM_CONTROL_CLASS, FormField } from '@/shared/components/ui/FormField';
import { MboService } from '../services/mboService';
import { showToast } from '@/shared/feedback/uiFeedback';
import { MBO_COPY } from './mboUiCopy';

interface Props {
  open: boolean;
  goalId: string;
  currentTargetValue?: string | number | null;
  currentDueDate?: string | null;
  onClose: () => void;
  onRevised: () => void;
}

export const MboReviseGoalModal: React.FC<Props> = ({
  open,
  goalId,
  currentTargetValue,
  currentDueDate,
  onClose,
  onRevised,
}) => {
  const [targetValue, setTargetValue] = useState(
    currentTargetValue == null ? '' : String(currentTargetValue),
  );
  const [dueDate, setDueDate] = useState(currentDueDate ?? '');
  const [unmetReason, setUnmetReason] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [busy, setBusy] = useState(false);

  const dirty = Boolean(unmetReason || revisionReason || targetValue || dueDate);

  const handleSubmit = () => {
    if (!unmetReason.trim() || !revisionReason.trim() || !dueDate) {
      showToast(MBO_COPY.reviseNeedFields, 'warning');
      return;
    }
    if (!targetValue.trim()) {
      showToast(MBO_COPY.reviseNeedTarget, 'warning');
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
      .then(() => {
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
