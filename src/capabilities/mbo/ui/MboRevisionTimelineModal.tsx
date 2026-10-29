import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { MboService } from '../services/mboService';
import { formatRevisionHistory, type FormattedRevisionItem } from '../domain/mboVisibilityEngine';

interface Props {
  open: boolean;
  goalId: string;
  currentTargetValue?: number | null;
  currentDueDate?: string | null;
  onClose: () => void;
}

export const MboRevisionTimelineModal: React.FC<Props> = ({
  open,
  goalId,
  currentTargetValue,
  currentDueDate,
  onClose,
}) => {
  const [items, setItems] = useState<FormattedRevisionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !goalId) return;
    setError(null);
    void MboService.listGoalRevisions(goalId)
      .then((rows) => {
        setItems(
          formatRevisionHistory(
            rows.map((row) => ({
              id: row.id,
              previousTargetValue: row.previous_target_value,
              previousDueDate: row.previous_due_date,
              previousTitle: row.previous_title,
              unmetReason: row.unmet_reason,
              revisionReason: row.revision_reason,
              revisedBy: row.revised_by,
              createdAt: row.created_at,
              changeKind: row.change_kind,
            })),
            { targetValue: currentTargetValue, dueDate: currentDueDate },
          ),
        );
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : '이력을 불러오지 못했습니다.');
      });
  }, [open, goalId, currentTargetValue, currentDueDate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">수정 이력 비교 타임라인</h2>
          <button type="button" className="min-h-12 min-w-12" aria-label="닫기" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {items.length === 0 && !error ? (
          <p className="text-sm text-slate-500">수정 이력이 없습니다.</p>
        ) : (
          <ol className="space-y-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className={`rounded-xl border p-3 text-sm ${
                  item.isDelete ? 'border-rose-200 bg-rose-50/40' : ''
                }`}
              >
                <p className="font-semibold">
                  #{index + 1} · {new Date(item.createdAt).toLocaleString('ko-KR')}
                  {item.isDelete ? (
                    <span className="ml-2 text-rose-700">삭제</span>
                  ) : item.changeKind === 'field' ? (
                    <span className="ml-2 text-slate-500">필드 변경</span>
                  ) : (
                    <span className="ml-2 text-slate-500">수정</span>
                  )}
                </p>
                {item.isDelete ? (
                  <>
                    <p className="mt-1 text-slate-700">제목: {item.titleLabel}</p>
                    <p className="text-slate-700">삭제 시점 목표치: {item.targetDiff}</p>
                    <p className="text-slate-700">삭제 시점 마감일: {item.dueDateDiff}</p>
                    <p className="mt-2 text-xs text-rose-700">삭제 사유: {item.revisionReason}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-slate-700">목표치: {item.targetDiff}</p>
                    <p className="text-slate-700">마감일: {item.dueDateDiff}</p>
                    <p className="mt-2 text-xs text-slate-500">미달 사유: {item.unmetReason}</p>
                    <p className="text-xs text-slate-500">수정 사유: {item.revisionReason}</p>
                  </>
                )}
                <p className="text-xs text-slate-400">수정자: {item.revisedBy.slice(0, 8)}…</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
