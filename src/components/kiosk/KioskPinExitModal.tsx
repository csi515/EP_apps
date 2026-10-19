import React, { useState } from 'react';

async function sha256Hex(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

type Props = {
  open: boolean;
  masterPinHash: string;
  onClose: () => void;
  onUnlocked: () => void;
};

export function KioskPinExitModal({ open, masterPinHash, onClose, onUnlocked }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  async function submit() {
    const hash = await sha256Hex(pin);
    if (!masterPinHash || hash !== masterPinHash) {
      setError('PIN이 일치하지 않습니다.');
      setPin('');
      return;
    }
    onUnlocked();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4">
        <h2 className="text-lg font-bold">관리 PIN</h2>
        <input
          inputMode="numeric"
          maxLength={4}
          className="mt-3 min-h-11 w-full rounded-lg border px-3 text-center text-2xl tracking-[0.4em]"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="min-h-11 px-4" onClick={onClose}>닫기</button>
          <button type="button" className="min-h-11 rounded-xl bg-slate-900 px-4 text-white" onClick={() => void submit()}>확인</button>
        </div>
      </div>
    </div>
  );
}
