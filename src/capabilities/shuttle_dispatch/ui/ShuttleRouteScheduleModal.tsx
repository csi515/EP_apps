import React, { useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { ShuttleDirection } from '../domain/shuttleRosterEngine';

export type ScheduleStopDraft = {
  id?: string;
  time: string;
  stop_name: string;
  remark: string;
};

export type ScheduleRouteDraft = {
  name: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  direction: ShuttleDirection;
  capacity: number;
  is_active: boolean;
  returnIsReverse: boolean;
  weekdayReturnTime: string;
  fridayReturnTime: string;
  stops: ScheduleStopDraft[];
};

export type ShuttleRouteScheduleModalProps = {
  open: boolean;
  title: string;
  initial: ScheduleRouteDraft;
  saving?: boolean;
  onClose: () => void;
  onSave: (draft: ScheduleRouteDraft) => void;
};

function emptyStop(): ScheduleStopDraft {
  return { time: '', stop_name: '', remark: '' };
}

/** 이미지형 시간표(시간·정류장·비고 + 퇴근 안내) 노선 입력 모달 */
export const ShuttleRouteScheduleModal: React.FC<ShuttleRouteScheduleModalProps> = ({
  open,
  title,
  initial,
  saving = false,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<ScheduleRouteDraft>(initial);

  // 모달이 열릴 때마다 초기값 동기화
  React.useEffect(() => {
    if (open) {
      setDraft({
        ...initial,
        stops: initial.stops.length > 0 ? initial.stops : [emptyStop(), emptyStop()],
      });
    }
  }, [open, initial]);

  const previewHeader = useMemo(() => {
    const vehicle = draft.vehicleNumber.trim() || '차량번호';
    const driver = draft.driverName.trim() || '기사';
    const phone = draft.driverPhone.trim();
    return `${draft.name.trim() || '노선명'} 현재차량 : ${vehicle} ${driver}${phone ? ` ${phone}` : ''}`;
  }, [draft]);

  if (!open) return null;

  function updateStop(index: number, patch: Partial<ScheduleStopDraft>) {
    setDraft((prev) => {
      const stops = [...prev.stops];
      stops[index] = { ...stops[index], ...patch };
      return { ...prev, stops };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-800">
            {previewHeader}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">
              노선·회사명 *
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="예: 포스코MC머티리얼즈"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              현재 차량 번호
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                value={draft.vehicleNumber}
                onChange={(e) => setDraft({ ...draft, vehicleNumber: e.target.value })}
                placeholder="예: 6105"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              담당 기사
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                value={draft.driverName}
                onChange={(e) => setDraft({ ...draft, driverName: e.target.value })}
                placeholder="예: 강호근"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              기사 연락처
              <input
                type="tel"
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                value={draft.driverPhone}
                onChange={(e) => setDraft({ ...draft, driverPhone: e.target.value })}
                placeholder="예: 010-9443-5720"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              방향
              <select
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                value={draft.direction}
                onChange={(e) =>
                  setDraft({ ...draft, direction: e.target.value as ShuttleDirection })
                }
              >
                <option value="TO_WORK">출근</option>
                <option value="FROM_WORK">퇴근</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-700">
              탑승 정원
              <input
                type="number"
                min={1}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                value={draft.capacity}
                onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) || 1 })}
              />
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs font-bold text-slate-600">
                  <th className="w-28 p-2.5">시간</th>
                  <th className="p-2.5">정류장</th>
                  <th className="w-40 p-2.5">비고</th>
                  <th className="w-14 p-2.5" />
                </tr>
              </thead>
              <tbody>
                {draft.stops.map((stop, index) => (
                  <tr key={stop.id ?? `row-${index}`} className="border-b border-slate-100">
                    <td className="p-2">
                      <input
                        type="time"
                        className="min-h-11 w-full rounded-lg border border-slate-200 px-2"
                        value={stop.time}
                        onChange={(e) => updateStop(index, { time: e.target.value })}
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className="min-h-11 w-full rounded-lg border border-slate-200 px-2"
                        value={stop.stop_name}
                        onChange={(e) => updateStop(index, { stop_name: e.target.value })}
                        placeholder="정류장명 (방면·승하차 안내 포함)"
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className="min-h-11 w-full rounded-lg border border-slate-200 px-2"
                        value={stop.remark}
                        onChange={(e) => updateStop(index, { remark: e.target.value })}
                        placeholder="예: 사람 안탐"
                      />
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            stops: prev.stops.filter((_, i) => i !== index),
                          }))
                        }
                        aria-label={`${index + 1}번 정류장 삭제`}
                        disabled={draft.stops.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => setDraft((prev) => ({ ...prev, stops: [...prev.stops, emptyStop()] }))}
          >
            <Plus className="h-4 w-4" />
            정류장 행 추가
          </button>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-bold text-slate-600">퇴근 안내</p>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={draft.returnIsReverse}
                onChange={(e) => setDraft({ ...draft, returnIsReverse: e.target.checked })}
              />
              퇴근은 역순
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-blue-800">
                월~목 퇴근 출발
                <input
                  type="time"
                  className="mt-1 min-h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-900"
                  value={draft.weekdayReturnTime}
                  onChange={(e) => setDraft({ ...draft, weekdayReturnTime: e.target.value })}
                />
              </label>
              <label className="block text-xs font-bold text-rose-700">
                금요일 퇴근 출발
                <input
                  type="time"
                  className="mt-1 min-h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-800"
                  value={draft.fridayReturnTime}
                  onChange={(e) => setDraft({ ...draft, fridayReturnTime: e.target.value })}
                />
              </label>
            </div>
            <div className="space-y-1 text-center text-sm font-extrabold leading-snug">
              {draft.returnIsReverse ? (
                <p className="text-blue-700">퇴근은 역순</p>
              ) : null}
              {draft.weekdayReturnTime ? (
                <p className="text-blue-700">
                  월~목 {draft.name.trim() || '회사'} {draft.weekdayReturnTime} 출발
                </p>
              ) : null}
              {draft.fridayReturnTime ? (
                <p className="text-rose-600">
                  금요일 퇴근 {draft.name.trim() || '회사'} {draft.fridayReturnTime} 출발
                </p>
              ) : null}
            </div>
          </div>

          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
            />
            활성 노선
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button type="button" className="min-h-11 px-4 text-sm font-semibold text-slate-600" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            disabled={saving}
            className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:bg-slate-300"
            onClick={() => onSave(draft)}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};
