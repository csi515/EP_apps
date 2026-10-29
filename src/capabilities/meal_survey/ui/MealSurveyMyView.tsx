import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showErrorToast, showToast } from '@/shared/feedback/uiFeedback';
import {
  DEFAULT_MEAL_SURVEY_SETTINGS,
  WEEKDAY_LABELS,
  activeMealSlots,
  cycleMealCellStatus,
  dayRange,
  isCafeteriaClosedOn,
  isMealSlotWritable,
  mealSlotLabel,
  mealStatusLabel,
  monthRange,
  parseDateKey,
  responseMapKey,
  toDateKey,
  weekRange,
  type MealCellStatus,
  type MealSlot,
  type MealSurveySettings,
  type WeekdayIndex,
} from '../domain/mealSurveyEngine';
import {
  bulkSkipMealSurveyRange,
  clearMealSurveyResponse,
  ensureMealSurveySettings,
  listMyMealSurveyResponses,
  settingsRowToDomain,
  upsertMealSurveyResponse,
} from '../mealSurveyService';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { MealSurveyMonthCalendar } from './MealSurveyMonthCalendar';

function statusChipClass(status: MealCellStatus): string {
  if (status === 'eating') return 'bg-emerald-500';
  if (status === 'skipping') return 'bg-slate-400';
  return 'bg-slate-200';
}

function statusButtonClass(status: MealCellStatus, writable: boolean): string {
  const base = 'min-h-12 flex-1 rounded-xl border px-3 text-sm font-semibold transition-colors';
  if (!writable) return `${base} cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400`;
  if (status === 'eating') return `${base} border-emerald-200 bg-emerald-50 text-emerald-800`;
  if (status === 'skipping') return `${base} border-slate-200 bg-slate-100 text-slate-700`;
  return `${base} border-dashed border-slate-300 bg-white text-slate-500`;
}

export const MealSurveyMyView: React.FC = () => {
  const { currentOrganization, selectedMembership } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const memberId = selectedMembership?.id ?? null;

  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [settings, setSettings] = useState<MealSurveySettings | null>({
    ...DEFAULT_MEAL_SURVEY_SETTINGS,
  });
  const [statusByKey, setStatusByKey] = useState<Record<string, MealCellStatus>>({});
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const range = useMemo(() => monthRange(anchor), [anchor]);
  const slots = useMemo(() => (settings ? activeMealSlots(settings) : []), [settings]);
  const selectedClosed = useMemo(
    () => (settings ? isCafeteriaClosedOn(settings, selectedDate) : false),
    [settings, selectedDate]
  );
  const selectedWeekday = parseDateKey(selectedDate).getDay() as WeekdayIndex;

  const reload = useCallback(async () => {
    if (!orgId || !memberId) return;
    setLoading(true);
    try {
      const settingsRow = await ensureMealSurveySettings(orgId);
      const domain = settingsRowToDomain(settingsRow);
      setSettings(domain);
      const rows = await listMyMealSurveyResponses(orgId, memberId, range.from, range.to);
      const next: Record<string, MealCellStatus> = {};
      for (const row of rows) {
        next[responseMapKey(row.meal_date, row.meal_slot)] = row.status;
      }
      setStatusByKey(next);
    } catch (cause) {
      showErrorToast(cause);
    } finally {
      setLoading(false);
    }
  }, [orgId, memberId, range.from, range.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function shiftMonth(delta: number) {
    setAnchor((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      return next;
    });
  }

  async function handleCycle(mealDate: string, mealSlot: MealSlot) {
    if (!orgId || !settings) return;
    if (isCafeteriaClosedOn(settings, mealDate)) {
      showToast('식당 휴무일입니다.', 'info');
      return;
    }
    if (!isMealSlotWritable(settings, mealDate, mealSlot)) {
      showToast('해당 끼니 신청이 마감되었습니다.', 'error');
      return;
    }
    const key = responseMapKey(mealDate, mealSlot);
    const current = statusByKey[key] ?? null;
    const next = cycleMealCellStatus(current);
    setBusyKey(key);
    try {
      if (next === null) {
        await clearMealSurveyResponse({ organizationId: orgId, mealDate, mealSlot });
      } else {
        await upsertMealSurveyResponse({
          organizationId: orgId,
          mealDate,
          mealSlot,
          status: next,
        });
      }
      setStatusByKey((prev) => ({ ...prev, [key]: next }));
    } catch (cause) {
      showErrorToast(cause);
      await reload();
    } finally {
      setBusyKey(null);
    }
  }

  async function handleBulkSkip(scope: 'day' | 'week') {
    if (!orgId || !settings) return;
    if (scope === 'day' && isCafeteriaClosedOn(settings, selectedDate)) {
      showToast('선택한 날은 식당 휴무일입니다.', 'info');
      return;
    }
    const r = scope === 'day' ? dayRange(parseDateKey(selectedDate)) : weekRange(parseDateKey(selectedDate));
    try {
      const result = await bulkSkipMealSurveyRange({
        organizationId: orgId,
        from: r.from,
        to: r.to,
      });
      showToast(`불참 처리 ${result.skipped_cells}칸 반영`, 'success');
      await reload();
    } catch (cause) {
      showErrorToast(cause);
    }
  }

  const title = `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`;

  return (
    <WorkPageFrame width="form">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">내 식수</h1>
          <p className="mt-1 text-sm text-slate-500">
            달력에서 날짜를 고른 뒤 끼니를 탭하세요. 식사 → 미식사 → 미응답.
            {settings?.defaultEating ? ' 평일 기본은 식사입니다.' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-slate-700 hover:bg-slate-50"
            onClick={() => void handleBulkSkip('day')}
          >
            선택일 불참
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-slate-700 hover:bg-slate-50"
            onClick={() => void handleBulkSkip('week')}
          >
            이번 주 불참
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200"
          onClick={() => shiftMonth(-1)}
          aria-label="이전 달"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <button
            type="button"
            className="mt-0.5 text-xs font-medium text-teal-700"
            onClick={() => {
              const today = new Date();
              setAnchor(today);
              setSelectedDate(toDateKey(today));
            }}
          >
            오늘로 이동
          </button>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200"
          onClick={() => shiftMonth(1)}
          aria-label="다음 달"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {!settings || slots.length === 0 ? (
        <p className="text-sm text-slate-500">
          {loading ? '불러오는 중…' : '제공 중인 식사가 없습니다. 관리자에게 설정을 요청하세요.'}
        </p>
      ) : (
        <>
          <MealSurveyMonthCalendar
            settings={settings}
            year={anchor.getFullYear()}
            monthIndex={anchor.getMonth()}
            selectedDate={selectedDate}
            onSelectDate={(day) => setSelectedDate(day.date)}
            renderDayBody={(day) => (
              <div className="mt-auto flex flex-wrap gap-0.5">
                {slots.map((slot) => {
                  const status = statusByKey[responseMapKey(day.date, slot)] ?? null;
                  return (
                    <span
                      key={slot}
                      title={`${mealSlotLabel(slot)} ${mealStatusLabel(status)}`}
                      className={`h-1.5 w-1.5 rounded-full ${statusChipClass(status)}`}
                    />
                  );
                })}
              </div>
            )}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                {selectedDate.slice(5).replace('-', '/')} ({WEEKDAY_LABELS[selectedWeekday]})
              </h2>
              {selectedClosed ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  식당 휴무
                </span>
              ) : (
                <span className="text-xs text-slate-500">탭하여 상태 변경</span>
              )}
            </div>

            {selectedClosed ? (
              <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-600">
                이 날은 식당을 운영하지 않습니다. 다른 운영일을 선택해 주세요.
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                {slots.map((slot) => {
                  const key = responseMapKey(selectedDate, slot);
                  const status = statusByKey[key] ?? null;
                  const writable = isMealSlotWritable(settings, selectedDate, slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={busyKey === key || !writable}
                      onClick={() => void handleCycle(selectedDate, slot)}
                      className={statusButtonClass(status, writable)}
                    >
                      <span className="block text-xs font-medium opacity-70">{mealSlotLabel(slot)}</span>
                      <span>{mealStatusLabel(status)}</span>
                      {!writable ? (
                        <span className="mt-0.5 block text-[10px] font-normal">마감</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <p className="text-xs text-slate-500">
            범례 · <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" /> 식사{' '}
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400 align-middle" /> 미식사{' '}
            <span className="inline-block h-2 w-2 rounded-full bg-slate-200 align-middle" /> 미응답 · 회색
            칸은 휴무
          </p>
        </>
      )}
    </WorkPageFrame>
  );
};
