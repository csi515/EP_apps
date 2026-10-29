import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const d = new Date(year, monthIndex, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseIso(iso: string): { year: number; monthIndex: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m] = iso.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return { year: y, monthIndex: m - 1 };
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export type MboScheduleRangePickerProps = {
  startDate: string;
  targetDate: string;
  onChange: (next: { startDate: string; targetDate: string }) => void;
};

/**
 * 연간 월 타임라인에서 드래그로 시작·종료 월을 지정한다.
 * 시작일은 해당 월 1일, 종료일은 해당 월 말일로 맞춘다.
 */
export const MboScheduleRangePicker: React.FC<MboScheduleRangePickerProps> = ({
  startDate,
  targetDate,
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragOriginRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const startParsed = parseIso(startDate);
  const endParsed = parseIso(targetDate);

  const [viewYear, setViewYear] = useState(() => {
    return startParsed?.year ?? endParsed?.year ?? new Date().getFullYear();
  });

  const rangeInView = useMemo(() => {
    if (!startParsed || !endParsed) return null;
    if (startParsed.year !== viewYear && endParsed.year !== viewYear) {
      // 범위가 다른 연도면 표시만 약하게
      if (startParsed.year < viewYear && endParsed.year > viewYear) {
        return { from: 0, to: 11 };
      }
      return null;
    }
    const from =
      startParsed.year < viewYear
        ? 0
        : startParsed.year > viewYear
          ? -1
          : startParsed.monthIndex;
    const to =
      endParsed.year > viewYear
        ? 11
        : endParsed.year < viewYear
          ? -1
          : endParsed.monthIndex;
    if (from < 0 || to < 0) return null;
    return { from: Math.min(from, to), to: Math.max(from, to) };
  }, [startParsed, endParsed, viewYear]);

  const monthFromClientX = useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.min(11, Math.floor(ratio * 12));
  }, []);

  const applyMonthRange = useCallback(
    (a: number, b: number) => {
      const from = Math.min(a, b);
      const to = Math.max(a, b);
      onChange({
        startDate: toIsoDate(viewYear, from, 1),
        targetDate: toIsoDate(viewYear, to, lastDayOfMonth(viewYear, to)),
      });
    },
    [onChange, viewYear]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const month = monthFromClientX(e.clientX);
    dragOriginRef.current = month;
    setDragging(true);
    applyMonthRange(month, month);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || dragOriginRef.current == null) return;
    applyMonthRange(dragOriginRef.current, monthFromClientX(e.clientX));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
    dragOriginRef.current = null;
  };

  return (
    <div className="space-y-2" data-testid="mbo-schedule-range-picker">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-700">일정 (드래그로 기간 지정)</label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => setViewYear((y) => y - 1)}
            aria-label="이전 해"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[4.5rem] text-center text-sm font-bold text-slate-900">
            {viewYear}년
          </span>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => setViewYear((y) => y + 1)}
            aria-label="다음 해"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        role="slider"
        aria-valuetext={`${startDate} ~ ${targetDate}`}
        aria-label="과제 일정 기간"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative grid h-14 cursor-ew-resize select-none grid-cols-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 touch-none ${
          dragging ? 'ring-2 ring-indigo-400' : ''
        }`}
      >
        {MONTH_LABELS.map((label, index) => {
          const inRange =
            rangeInView != null && index >= rangeInView.from && index <= rangeInView.to;
          const isEdge =
            rangeInView != null && (index === rangeInView.from || index === rangeInView.to);
          return (
            <div
              key={label}
              className={`relative flex items-end justify-center border-r border-slate-200/80 pb-1.5 text-[10px] font-bold last:border-r-0 ${
                inRange ? 'bg-indigo-500/90 text-white' : 'text-slate-500'
              } ${isEdge ? 'bg-indigo-600 text-white' : ''}`}
            >
              {label}월
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-600">
        <span className="font-semibold text-slate-800">{startDate}</span>
        <span className="mx-1.5 text-slate-400">~</span>
        <span className="font-semibold text-slate-800">{targetDate}</span>
        <span className="ml-2 text-slate-400">월 칸을 드래그해 기간을 정하세요</span>
      </p>
    </div>
  );
};
