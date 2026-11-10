import React from 'react';

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
        <h3 className="text-base font-extrabold text-slate-900">과제 삭제</h3>
        <p className="text-xs text-slate-500">삭제하면 목록에서 숨겨지며, 삭제 사유와 시점이 이력에 남습니다.</p>
        <textarea
          value={deleteReason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="삭제 사유 *"
          className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs"
          required
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="min-h-12 px-4 text-xs font-semibold text-slate-500" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="min-h-12 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white"
            onClick={onConfirm}
          >
            삭제 확정
          </button>
        </div>
      </div>
    </div>
  );
};
