import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FORM_CONTROL_CLASS, FormField } from '@/shared/components/ui/FormField';
import { MboService } from '../services/mboService';
import { showToast } from '@/shared/feedback/uiFeedback';

interface Props {
  open: boolean;
  goalId: string;
  currentTargetValue?: number | null;
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
  const [targetValue, setTargetValue] = useState(String(currentTargetValue ?? ''));
  const [dueDate, setDueDate] = useState(currentDueDate ?? '');
  const [unmetReason, setUnmetReason] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [busy, setBusy] = useState(false);

  const dirty = Boolean(unmetReason || revisionReason || targetValue || dueDate);

  const handleSubmit = () => {
    if (!unmetReason.trim() || !revisionReason.trim() || !dueDate) {
      showToast('미달 사유, 수정 사유, 마감일은 필수입니다.', 'warning');
      return;
    }
    setBusy(true);
    void MboService.reviseGoal({
      goalId,
      newTargetValue: Number(targetValue),
      newDueDate: dueDate,
      unmetReason: unmetReason.trim(),
      revisionReason: revisionReason.trim(),
    })
      .then(() => {
        showToast('목표가 수정되었고 이력이 저장되었습니다.', 'success');
        onRevised();
        onClose();
      })
      .catch((cause) => {
        showToast(cause instanceof Error ? cause.message : '수정 실패', 'error');
      })
      .finally(() => setBusy(false));
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="목표 수치·기한 정정"
      maxWidth="lg"
      intent="form"
      dirty={dirty}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" isLoading={busy} onClick={handleSubmit}>
            수정 확정
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <FormField label="신규 목표치" htmlFor="mbo-revise-target">
          <input
            id="mbo-revise-target"
            className={FORM_CONTROL_CLASS}
            type="number"
            value={targetValue}
            onChange={(event) => setTargetValue(event.target.value)}
            required
          />
        </FormField>
        <FormField label="변경 마감일" htmlFor="mbo-revise-due">
          <input
            id="mbo-revise-due"
            className={FORM_CONTROL_CLASS}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </FormField>
        <FormField label="미달성 사유 (원인 분석)" htmlFor="mbo-revise-unmet">
          <textarea
            id="mbo-revise-unmet"
            className={`${FORM_CONTROL_CLASS} min-h-24 resize-none`}
            value={unmetReason}
            onChange={(event) => setUnmetReason(event.target.value)}
            required
          />
        </FormField>
        <FormField label="목표/일정 수정 사유" htmlFor="mbo-revise-reason">
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
