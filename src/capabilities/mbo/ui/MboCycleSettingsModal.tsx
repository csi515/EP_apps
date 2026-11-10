import React, { useEffect, useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  DEFAULT_MBO_CYCLE,
  type MboCycleSettings,
} from '../domain/mboCycle';
import {
  applyLockDate,
  applyReviewEnd,
  applyReviewStart,
  lockDateToIso,
  reviewEndToIso,
  reviewStartToIso,
} from '../domain/mboCycleDisplay';
import { upsertMboCycleSettings } from '../services/mboCycleService';

type Props = {
  open: boolean;
  organizationId: string;
  canEdit: boolean;
  initialSettings: MboCycleSettings;
  onClose: () => void;
  onSaved: (settings: MboCycleSettings) => void;
};

export function MboCycleSettingsModal({
  open,
  organizationId,
  canEdit,
  initialSettings,
  onClose,
  onSaved,
}: Props) {
  const displayYear = new Date().getFullYear();
  const [settings, setSettings] = useState<MboCycleSettings>(initialSettings);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSettings(initialSettings);
  }, [open, initialSettings]);

  const lockIso = lockDateToIso(displayYear, settings);
  const reviewStartIso = reviewStartToIso(displayYear, settings);
  const reviewEndIso = reviewEndToIso(displayYear, settings);

  async function save() {
    if (!canEdit) return;
    setBusy(true);
    try {
      const next = await upsertMboCycleSettings(organizationId, settings);
      onSaved(next);
      showToast('목표 수정 마감과 평가 기간이 저장되었습니다.', 'success');
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '저장 실패', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="목표 일정 설정"
      maxWidth="lg"
      intent="form"
      description="매년 반복되는 목표 수정 마감·평가 기간입니다. 월·일은 날짜로 지정합니다."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="min-h-12 rounded-xl px-4 text-sm font-semibold text-slate-600"
            onClick={onClose}
          >
            취소
          </button>
          {canEdit ? (
            <button
              type="button"
              disabled={busy}
              className="min-h-12 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-50"
              onClick={() => void save()}
            >
              저장
            </button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <label className="flex min-h-12 items-center gap-2 font-semibold text-slate-800">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={settings.goalLockEnabled}
            onChange={(e) => setSettings((c) => ({ ...c, goalLockEnabled: e.target.checked }))}
          />
          목표 수정 마감 사용 (마감일 이후 목표 문구·핵심 지표 수정 불가)
        </label>

        <FieldBlock
          label="목표 수정 마감일"
          disabled={!canEdit || !settings.goalLockEnabled}
        >
          <input
            type="date"
            disabled={!canEdit || !settings.goalLockEnabled}
            className="min-h-12 w-full rounded-xl border border-slate-200 px-3"
            value={lockIso}
            onChange={(e) => setSettings((c) => applyLockDate(c, e.target.value))}
          />
        </FieldBlock>

        <FieldBlock label="연말 평가 시작일" disabled={!canEdit}>
          <input
            type="date"
            disabled={!canEdit}
            className="min-h-12 w-full rounded-xl border border-slate-200 px-3"
            value={reviewStartIso}
            onChange={(e) => setSettings((c) => applyReviewStart(c, e.target.value))}
          />
        </FieldBlock>

        <FieldBlock label="연말 평가 종료일" disabled={!canEdit}>
          <input
            type="date"
            disabled={!canEdit}
            className="min-h-12 w-full rounded-xl border border-slate-200 px-3"
            value={reviewEndIso}
            onChange={(e) => setSettings((c) => applyReviewEnd(c, e.target.value))}
          />
        </FieldBlock>

        {canEdit ? (
          <button
            type="button"
            className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
            onClick={() => setSettings({ ...DEFAULT_MBO_CYCLE })}
          >
            기본값 (1/31 수정 마감 · 12/1~12/31 평가)
          </button>
        ) : (
          <p className="text-xs text-slate-500">사업주·관리자만 변경할 수 있습니다.</p>
        )}

        <p className="text-xs leading-relaxed text-slate-500">
          분기·월별 진행 기록은 연중 작성할 수 있습니다. 평가 점수는 급여·승진과 연결되지 않습니다.
        </p>
      </div>
    </Modal>
  );
}

function FieldBlock({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-xs font-bold text-slate-600 ${disabled ? 'opacity-50' : ''}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
