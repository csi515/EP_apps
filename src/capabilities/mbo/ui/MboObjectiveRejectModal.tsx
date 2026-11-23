import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';

type Props = {
  objectiveId: string | null;
  rejectionInput: string;
  onRejectionChange: (v: string) => void;
  onClose: () => void;
  onConfirm: (objectiveId: string, reason: string) => void;
};

export const MboObjectiveRejectModal: React.FC<Props> = ({
  objectiveId,
  rejectionInput,
  onRejectionChange,
  onClose,
  onConfirm,
}) => {
  if (!objectiveId) return null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="목표 반려 사유 작성"
      maxWidth="sm"
      intent="form"
      dirty={Boolean(rejectionInput.trim())}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm(objectiveId, rejectionInput);
              onClose();
            }}
          >
            반려 처리
          </Button>
        </div>
      }
    >
      <textarea
        value={rejectionInput}
        onChange={(e) => onRejectionChange(e.target.value)}
        placeholder="구체적인 반려 사유와 수정 권고 사항을 입력하세요."
        className={`${FORM_CONTROL_CLASS} h-24 resize-none text-xs`}
      />
    </Modal>
  );
};
