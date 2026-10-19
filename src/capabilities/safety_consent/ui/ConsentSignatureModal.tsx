import React, { useEffect, useRef, useState } from 'react';
import { buildConsentSubmission, nextConsentStatus } from '../domain/safetyConsentEngine';

const REQUIRED = ['개인정보', '안전수칙', '환불규정'] as const;

type Props = { openOnMount?: boolean };

export function ConsentSignatureModal({ openOnMount = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(openOnMount);
  const [status, setStatus] = useState<'REQUIRED' | 'SIGNED'>('REQUIRED');
  const [saved, setSaved] = useState<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !open) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let drawing = false;
    const point = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const start = (event: PointerEvent) => {
      drawing = true;
      const p = point(event);
      context.beginPath();
      context.moveTo(p.x, p.y);
    };
    const move = (event: PointerEvent) => {
      if (!drawing) return;
      const p = point(event);
      context.lineTo(p.x, p.y);
      context.stroke();
    };
    const end = () => {
      drawing = false;
    };
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    return () => {
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
    };
  }, [open]);

  function submit() {
    const signature = canvasRef.current?.toDataURL('image/png') ?? '';
    const record = buildConsentSubmission({ version: 1, signature });
    setStatus(nextConsentStatus('REQUIRED', true));
    setSaved(`${record.consented_at} / v${record.consent_version}`);
    setOpen(false);
  }

  if (status === 'SIGNED' && !open) {
    return <p className="text-xs text-emerald-700">동의 기록 {saved}</p>;
  }
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" role="dialog">
      <div className="w-full rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <h2 className="text-lg font-black">필수 동의서</h2>
        <ul className="mt-2 text-sm text-slate-600">
          {REQUIRED.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <canvas ref={canvasRef} width={320} height={140} className="mt-3 w-full rounded-xl border bg-slate-50 touch-none" />
        <button type="button" className="mt-3 min-h-12 w-full rounded-xl bg-slate-900 font-bold text-white" onClick={submit}>
          서명 제출
        </button>
      </div>
    </div>
  );
}
