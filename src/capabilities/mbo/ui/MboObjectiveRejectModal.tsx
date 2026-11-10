import React from 'react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
        <h3 className="text-base font-extrabold text-slate-900">목표 반려 사유 작성</h3>
        <textarea
          value={rejectionInput}
          onChange={(e) => onRejectionChange(e.target.value)}
          placeholder="구체적인 반려 사유와 수정 권고 사항을 입력하세요."
          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none h-24"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-500">
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(objectiveId, rejectionInput);
              onClose();
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
          >
            반려 처리
          </button>
        </div>
      </div>
    </div>
  );
};
