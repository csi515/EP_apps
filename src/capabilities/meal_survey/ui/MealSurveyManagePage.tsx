import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showErrorToast } from '@/shared/feedback/uiFeedback';
import {
  DEFAULT_CLOSED_WEEKDAYS,
  DEFAULT_MEAL_SURVEY_SETTINGS,
  WEEKDAY_LABELS,
  activeMealSlots,
  isCafeteriaClosedOn,
  mealSlotLabel,
  mealStatusLabel,
  monthRange,
  parseDateKey,
  responseMapKey,
  toDateKey,
  type MealSlot,
  type MealSurveySettings,
  type WeekdayIndex,
} from '../domain/mealSurveyEngine';
import {
  ensureMealSurveySettings,
  listMealSurveyOverview,
  settingsRowToDomain,
  type MealSurveyOverview,
} from '../mealSurveyService';
import { MealSurveyManageGate } from './MealSurveyAccessGate';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { MealSurveyMonthCalendar } from './MealSurveyMonthCalendar';

function overviewToSettings(
  overview: MealSurveyOverview | null,
  fallback: MealSurveySettings
): MealSurveySettings {
  if (!overview) return fallback;
  return {
    ...fallback,
    offerBreakfast: overview.settings.offer_breakfast,
    offerLunch: overview.settings.offer_lunch,
    offerDinner: overview.settings.offer_dinner,
    closedWeekdays: (overview.settings.closed_weekdays?.length
      ? overview.settings.closed_weekdays
      : DEFAULT_CLOSED_WEEKDAYS) as WeekdayIndex[],
    closedDates: overview.settings.closed_dates ?? fallback.closedDates,
    openDates: overview.settings.open_dates ?? fallback.openDates,
  };
}

const MealSurveyManageInner: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [settings, setSettings] = useState<MealSurveySettings>({ ...DEFAULT_MEAL_SURVEY_SETTINGS });
  const [overview, setOverview] = useState<MealSurveyOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => monthRange(anchor), [anchor]);
  const calendarSettings = useMemo(
    () => overviewToSettings(overview, settings),
    [overview, settings]
  );
  const slots = useMemo(() => activeMealSlots(calendarSettings), [calendarSettings]);
  const selectedClosed = isCafeteriaClosedOn(calendarSettings, selectedDate);
  const selectedWeekday = parseDateKey(selectedDate).getDay() as WeekdayIndex;

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const settingsRow = await ensureMealSurveySettings(orgId);
      const domain = settingsRowToDomain(settingsRow);
      setSettings(domain);
      const data = await listMealSurveyOverview(orgId, range.from, range.to);
      setOverview(data);
    } catch (cause) {
      showErrorToast(cause);
    } finally {
      setLoading(false);
    }
  }, [orgId, range.from, range.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dayMap = useMemo(() => {
    const map = new Map<string, { eating: number; skipping: number; unset: number }>();
    for (const d of overview?.days ?? []) {
      map.set(responseMapKey(d.meal_date, d.meal_slot), {
        eating: d.eating_count,
        skipping: d.skipping_count,
        unset: d.unset_count,
      });
    }
    return map;
  }, [overview]);

  function memberStatus(memberId: string, mealDate: string, slot: MealSlot) {
    const member = overview?.members.find((m) => m.member_id === memberId);
    const hit = member?.responses.find((r) => r.meal_date === mealDate && r.meal_slot === slot);
    return hit?.status ?? null;
  }

  const selectedAggs = slots.map((slot) => ({
    slot,
    agg: dayMap.get(responseMapKey(selectedDate, slot)),
  }));

  return (
    <WorkPageFrame width="hub">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">조리팀 식수 모니터</h1>
        <p className="mt-1 text-sm text-slate-500">
          달력에서 운영일을 고르면 확정 식수를 볼 수 있습니다. 대상{' '}
          {overview?.member_count ?? '—'}명
        </p>
      </header>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200"
          onClick={() => setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          aria-label="이전 달"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-base font-semibold text-slate-900">
            {anchor.getFullYear()}년 {anchor.getMonth() + 1}월
          </p>
          <button
            type="button"
            className="text-xs font-medium text-teal-700"
            onClick={() => {
              const today = new Date();
              setAnchor(today);
              setSelectedDate(toDateKey(today));
            }}
          >
            오늘
          </button>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200"
          onClick={() => setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          aria-label="다음 달"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading && !overview ? (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      ) : (
        <>
          <MealSurveyMonthCalendar
            settings={calendarSettings}
            year={anchor.getFullYear()}
            monthIndex={anchor.getMonth()}
            selectedDate={selectedDate}
            onSelectDate={(day) => setSelectedDate(day.date)}
            renderDayBody={(day) => {
              const lunch = dayMap.get(responseMapKey(day.date, 'lunch'));
              const primary = lunch ?? dayMap.get(responseMapKey(day.date, slots[0] ?? 'lunch'));
              if (!primary) return null;
              return (
                <p className="text-[10px] font-semibold leading-tight text-teal-800">
                  식사 {primary.eating}
                </p>
              );
            }}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                {selectedDate} ({WEEKDAY_LABELS[selectedWeekday]})
              </h2>
              {selectedClosed ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  휴무
                </span>
              ) : null}
            </div>
            {selectedClosed ? (
              <p className="text-sm text-slate-600">식당 휴무일이라 식수 집계 대상이 아닙니다.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                {selectedAggs.map(({ slot, agg }) => (
                  <div
                    key={slot}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm"
                  >
                    <p className="font-semibold text-slate-800">{mealSlotLabel(slot)}</p>
                    <p className="mt-1 text-slate-600">
                      {agg
                        ? `식사 ${agg.eating} · 미식 ${agg.skipping} · 미응 ${agg.unset}`
                        : '집계 없음'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {!selectedClosed ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-800">멤버별 ({selectedDate})</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="sticky left-0 bg-slate-50 px-3 py-2 font-medium">이름</th>
                      {slots.map((slot) => (
                        <th key={slot} className="px-3 py-2 font-medium">
                          {mealSlotLabel(slot)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(overview?.members ?? []).map((member) => (
                      <tr key={member.member_id} className="border-t border-slate-100">
                        <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 font-medium text-slate-800">
                          {member.display_name}
                        </td>
                        {slots.map((slot) => (
                          <td key={slot} className="px-3 py-2 text-slate-600">
                            {mealStatusLabel(memberStatus(member.member_id, selectedDate, slot))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </WorkPageFrame>
  );
};

export const MealSurveyManagePage: React.FC = () => (
  <MealSurveyManageGate>
    <MealSurveyManageInner />
  </MealSurveyManageGate>
);
