import React, { useMemo } from 'react';
import {
  WEEKDAY_LABELS,
  buildMealMonthGrid,
  type MealCalendarDay,
  type MealSurveySettings,
  type WeekdayIndex,
} from '../domain/mealSurveyEngine';

const WEEK_HEADER: WeekdayIndex[] = [0, 1, 2, 3, 4, 5, 6];

export type MealSurveyMonthCalendarProps = {
  settings: Pick<MealSurveySettings, 'closedWeekdays' | 'closedDates' | 'openDates'>;
  year: number;
  /** 0–11 */
  monthIndex: number;
  selectedDate?: string | null;
  onSelectDate?: (day: MealCalendarDay) => void;
  /** 운영일 셀 하단 커스텀 요약 */
  renderDayBody?: (day: MealCalendarDay) => React.ReactNode;
  /** 관리자: 휴무 토글 모드 힌트 */
  interactiveHint?: string;
  className?: string;
};

export const MealSurveyMonthCalendar: React.FC<MealSurveyMonthCalendarProps> = ({
  settings,
  year,
  monthIndex,
  selectedDate,
  onSelectDate,
  renderDayBody,
  interactiveHint,
  className = '',
}) => {
  const days = useMemo(
    () => buildMealMonthGrid(settings, year, monthIndex),
    [settings, year, monthIndex]
  );

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}>
      {interactiveHint ? (
        <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {interactiveHint}
        </p>
      ) : null}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/90 text-center text-xs font-semibold text-slate-600">
        {WEEK_HEADER.map((wd) => (
          <div
            key={wd}
            className={`py-2 ${wd === 0 ? 'text-rose-600' : wd === 6 ? 'text-indigo-600' : ''}`}
          >
            {WEEKDAY_LABELS[wd]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
        {days.map((day) => {
          const selected = selectedDate === day.date;
          const closed = day.isClosed;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate?.(day)}
              disabled={!onSelectDate}
              className={[
                'flex min-h-[4.5rem] flex-col gap-1 p-1.5 text-left transition-colors sm:min-h-[5.5rem]',
                !day.isCurrentMonth ? 'bg-slate-50/70 text-slate-300' : 'bg-white',
                closed && day.isCurrentMonth ? 'bg-slate-100/80' : '',
                day.isToday ? 'ring-1 ring-inset ring-teal-500' : '',
                selected ? 'bg-teal-50 ring-2 ring-inset ring-teal-600' : '',
                onSelectDate ? 'cursor-pointer hover:bg-teal-50/40' : 'cursor-default',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={[
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    day.isToday ? 'bg-teal-600 text-white' : '',
                    !day.isToday && day.weekday === 0 ? 'text-rose-600' : '',
                    !day.isToday && day.weekday === 6 ? 'text-indigo-600' : '',
                    !day.isToday && day.weekday !== 0 && day.weekday !== 6 && day.isCurrentMonth
                      ? 'text-slate-800'
                      : '',
                    !day.isCurrentMonth && !day.isToday ? 'text-slate-300' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {day.dayNumber}
                </span>
                {closed ? (
                  <span className="rounded bg-slate-200/80 px-1 py-0.5 text-[10px] font-medium text-slate-600">
                    휴무
                  </span>
                ) : null}
              </div>
              <div className="min-h-0 flex-1">{closed ? null : renderDayBody?.(day)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
