import React, { useEffect, useRef, useState } from 'react';
import { completeRepledge } from '../services/riskAssessmentApprovalService';

type PendingRepledge = {
  id: string;
  assessment_id: string;
  required_version: number;
};

type Props = {
  pending: PendingRepledge | null;
  processName?: string;
  onCompleted: () => void;
};

/**
 * 개정된 작업표준 확인 및 안전 서약 팝업 (현장 모바일 TBM)
 */
export const WorkerRepledgeModal: React.FC<Props> = ({ pending, processName, onCompleted }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const point = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const start = (e: PointerEvent) => {
      drawing.current = true;
      const p = point(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };
    const move = (e: PointerEvent) => {
      if (!drawing.current) return;
      const p = point(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const end = () => {
      drawing.current = false;
    };
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    return () => {
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
    };
  }, [pending]);

  if (!pending) return null;

  const submit = async () => {
    setError(null);
    const signature = canvasRef.current?.toDataURL('image/png') ?? '';
    if (signature.length < 100) {
      setError('터치 서명이 필요합니다.');
      return;
    }
    setBusy(true);
    try {
      await completeRepledge(pending.id, signature);
      onCompleted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '서약 저장 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/50" role="dialog" aria-modal>
      <div className="w-full rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <h2 className="text-lg font-black text-slate-900">개정된 작업표준 확인 및 안전 서약</h2>
        <p className="mt-2 text-sm text-slate-600">
          {processName ? `공정: ${processName}` : '해당 공정'} · v{pending.required_version}.0 개정본을
          확인하고 작업 전 서약해 주세요. 서약 완료 전까지 당일 작업 출결/티켓이 활성화되지 않습니다.
        </p>
        <canvas
          ref={canvasRef}
          width={360}
          height={140}
          className="mt-3 w-full touch-none rounded-xl border border-slate-300 bg-slate-50"
        />
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        <button
          type="button"
          className="mt-3 h-12 w-full rounded-xl bg-slate-900 font-bold text-white"
          onClick={() => void submit()}
          disabled={busy}
        >
          {busy ? '저장 중…' : '확인 및 서약 완료'}
        </button>
      </div>
    </div>
  );
};
