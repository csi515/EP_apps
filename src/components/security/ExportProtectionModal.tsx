import React, { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (pin: string, reason: string) => void;
};

export function ExportProtectionModal({ open, onClose, onConfirm }: Props) {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/40 sm:items-center">
      <form
        className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(pin, reason.trim());
          setPin('');
          setReason('');
        }}
      >
        <h2 className="text-lg font-bold">명부 반출 확인</h2>
        <p className="mt-2 text-sm text-slate-600">사업자 마스터 PIN과 반출 사유를 입력해야 회원 명부를 내려받을 수 있습니다.</p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="마스터 PIN"
          className="mt-4 min-h-12 w-full rounded-xl border px-3"
        />
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="반출 사유"
          className="mt-2 min-h-12 w-full rounded-xl border px-3"
        />
        <button type="submit" disabled={pin.length < 4 || reason.trim().length < 2} className="mt-3 min-h-12 w-full rounded-xl bg-slate-900 text-sm font-bold text-white">
          확인하고 내려받기
        </button>
        <button type="button" className="mt-2 min-h-12 w-full text-sm" onClick={onClose}>
          취소
        </button>
      </form>
    </div>
  );
}
