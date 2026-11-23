import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FORM_CONTROL_CLASS, FormField } from '@/shared/components/ui/FormField';

type Props = {
  open: boolean;
  objectiveTitle: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  busy?: boolean;
};

/** 목표 수정 마감 후 목표·비중 변경 승인 요청(사유 필수) */
export function MboGoalChangeRequestModal({
  open,
  objectiveTitle,
  onClose,
  onSubmit,
  busy = false,
}: Props) {
  const [reason, setReason] = useState('');
  const canSubmit = reason.trim().length >= 8;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="목표 변경 승인 요청"
      maxWidth="md"
      intent="form"
      dirty={Boolean(reason.trim())}
      description="지금은 목표를 바로 고칠 수 없습니다. 부서장 승인 후 반영됩니다."
      footer={
        <div className="flex w-full gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            isLoading={busy}
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              onSubmit(reason.trim());
            }}
          >
            승인 요청 보내기
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="font-medium text-slate-900">{objectiveTitle}</p>
        <FormField label="변경 사유 (필수)" htmlFor="mbo-goal-change-reason">
          <textarea
            id="mbo-goal-change-reason"
            className={`${FORM_CONTROL_CLASS} min-h-28 resize-none`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="변경이 필요한 배경을 적어 주세요."
          />
        </FormField>
      </div>
    </Modal>
  );
}
