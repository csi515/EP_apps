import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';

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

  if (!open) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="목표 변경 승인 요청"
      maxWidth="md"
      description="지금은 목표를 바로 고칠 수 없습니다. 부서장 승인 후 반영됩니다."
    >
      <div className="space-y-3 text-sm">
        <p className="font-bold text-slate-900">{objectiveTitle}</p>
        <label className="block text-xs font-bold text-slate-700">
          변경 사유 (필수)
          <textarea
            className="mt-1 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="변경이 필요한 배경을 적어 주세요."
          />
        </label>
        <ActionButtons
          busy={busy}
          onClose={onClose}
          onSubmit={() => {
            if (reason.trim().length < 8) return;
            onSubmit(reason.trim());
          }}
          disabled={reason.trim().length < 8}
        />
      </div>
    </Modal>
  );
}

function ActionButtons({
  busy,
  onClose,
  onSubmit,
  disabled,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        className="min-h-12 flex-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
        onClick={onClose}
      >
        취소
      </button>
      <button
        type="button"
        disabled={disabled || busy}
        className="min-h-12 flex-1 rounded-xl bg-indigo-600 text-xs font-bold text-white disabled:opacity-40"
        onClick={onSubmit}
      >
        승인 요청 보내기
      </button>
    </div>
  );
}
