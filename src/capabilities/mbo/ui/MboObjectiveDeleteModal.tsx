import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  open: boolean;
  deleteReason: string;
  onReasonChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export const MboObjectiveDeleteModal: React.FC<Props> = ({
  open,
  deleteReason,
  onReasonChange,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="과제 삭제"
      maxWidth="sm"
      intent="form"
      dirty={Boolean(deleteReason.trim())}
      description="삭제하면 목록에서 숨겨지며, 삭제 사유와 시점이 이력에 남습니다."
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            삭제 확정
          </Button>
        </div>
      }
    >
      <textarea
        value={deleteReason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder={MBO_COPY.deleteReasonRequired}
        className={`${FORM_CONTROL_CLASS} h-24 resize-none text-xs`}
        required
      />
    </Modal>
  );
};
