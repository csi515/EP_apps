import React, { useEffect, useRef, useState } from 'react';
import { CanAccess } from '@refinedev/core';
import { validateRejectReason } from '../domain/approvalEngine';

type Mode = 'approve' | 'reject' | null;

type Props = {
  open: boolean;
  mode: Mode;
  title: string;
  stepOrder: 2 | 3;
  requireNextAssignee?: boolean;
  onClose: () => void;
  onApprove: (input: { signature: string; comment: string; nextAssigneeId?: string }) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
};

export const ApprovalActionModal: React.FC<Props> = ({
  open,
  mode,
  title,
  stepOrder,
  requireNextAssignee = false,
  onClose,
  onApprove,
  onReject,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [nextAssigneeId, setNextAssigneeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || mode !== 'approve') return;
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
    const start = (event: PointerEvent) => {
      drawing.current = true;
      const p = point(event);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };
    const move = (event: PointerEvent) => {
      if (!drawing.current) return;
      const p = point(event);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const end = () => {
      drawing.current = false;
    };

    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointerleave', end);
    return () => {
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointerleave', end);
    };
  }, [open, mode]);

  if (!open || !mode) return null;

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleApprove = async () => {
    setError(null);
    if (requireNextAssignee && !nextAssigneeId.trim()) {
      setError('최종 승인 사업자(사업주)를 지정해 주세요.');
      return;
    }
    const signature = canvasRef.current?.toDataURL('image/png') ?? '';
    if (signature.length < 100) {
      setError('자필 서명이 필요합니다.');
      return;
    }
    setBusy(true);
    try {
      await onApprove({
        signature,
        comment,
        nextAssigneeId: nextAssigneeId.trim() || undefined,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '승인 처리 실패');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setError(null);
    const check = validateRejectReason(rejectReason);
    if (!check.isValid) {
      setError(check.error ?? '반려 사유 필수');
      return;
    }
    setBusy(true);
    try {
      await onReject(rejectReason.trim());
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '반려 처리 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center" role="dialog" aria-modal>
      <div className="w-full rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-2xl">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'approve'
            ? stepOrder === 2
              ? '검토 승인 후 사업자(사업주)에게 상신합니다.'
              : '최종 승인(사업주) — 문서가 잠기고 개정 이력이 보존됩니다.'
            : '반려 사유(보완 요청 사항)를 입력해 주세요.'}
        </p>

        {mode === 'approve' ? (
          <div className="mt-3 space-y-3">
            {requireNextAssignee ? (
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">최종 승인자(사업주) ID</span>
                <input
                  className="mt-1 h-12 w-full rounded-lg border border-slate-300 px-3"
                  value={nextAssigneeId}
                  onChange={(e) => setNextAssigneeId(e.target.value)}
                  placeholder="승인자 사용자 UUID"
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">의견(선택)</span>
              <input
                className="mt-1 h-12 w-full rounded-lg border border-slate-300 px-3"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
            <div>
              <div className="mb-1 text-sm font-semibold text-slate-700">자필 서명</div>
              <canvas
                ref={canvasRef}
                width={360}
                height={140}
                className="w-full touch-none rounded-xl border border-slate-300 bg-slate-50"
              />
              <button type="button" className="mt-2 h-12 px-4 text-sm font-semibold text-slate-600" onClick={clearCanvas}>
                서명 지우기
              </button>
            </div>
          </div>
        ) : (
          <label className="mt-3 block text-sm">
            <span className="font-semibold text-slate-700">반려 사유(보완 요청 사항)</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-3"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="보완이 필요한 항목을 구체적으로 적어 주세요"
            />
          </label>
        )}

        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-4 flex gap-2">
          <button type="button" className="h-12 flex-1 rounded-xl border border-slate-300 font-bold" onClick={onClose} disabled={busy}>
            취소
          </button>
          <CanAccess resource="sop_risk_assessment" action={mode === 'approve' ? 'approve' : 'reject'} fallback={null}>
            <button
              type="button"
              className={[
                'h-12 flex-1 rounded-xl font-bold text-white',
                mode === 'approve' ? 'bg-emerald-700' : 'bg-rose-700',
              ].join(' ')}
              onClick={() => void (mode === 'approve' ? handleApprove() : handleReject())}
              disabled={busy}
            >
              {busy ? '처리 중…' : mode === 'approve' ? (stepOrder === 2 ? '검토 승인 / 상신' : '최종 승인') : '반려'}
            </button>
          </CanAccess>
        </div>
      </div>
    </div>
  );
};
