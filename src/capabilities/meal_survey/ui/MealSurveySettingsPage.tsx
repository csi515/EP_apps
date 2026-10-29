import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showErrorToast, showToast } from '@/shared/feedback/uiFeedback';
import {
  DEFAULT_MEAL_SURVEY_SETTINGS,
  WEEKDAY_LABELS,
  toggleCafeteriaClosedDate,
  toggleClosedWeekday,
  validateMealSurveySettings,
  type MealSurveySettings,
  type WeekdayIndex,
} from '../domain/mealSurveyEngine';
import {
  ensureMealSurveySettings,
  settingsRowToDomain,
  upsertMealSurveySettings,
} from '../mealSurveyService';
import { MealSurveyManageGate } from './MealSurveyAccessGate';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { MealSurveyMonthCalendar } from './MealSurveyMonthCalendar';

const WEEKDAY_ORDER: WeekdayIndex[] = [1, 2, 3, 4, 5, 6, 0];

const MealSurveySettingsInner: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const [draft, setDraft] = useState<MealSurveySettings>({ ...DEFAULT_MEAL_SURVEY_SETTINGS });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date());

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const row = await ensureMealSurveySettings(orgId);
      setDraft(settingsRowToDomain(row));
    } catch (cause) {
      showErrorToast(cause);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSave() {
    const check = validateMealSurveySettings(draft);
    if (!check.isValid) {
      showToast(check.error ?? '설정이 올바르지 않습니다.', 'error');
      return;
    }
    if (!orgId) return;
    setSaving(true);
    try {
      const row = await upsertMealSurveySettings(orgId, draft);
      setDraft(settingsRowToDomain(row));
      showToast('식수 설정을 저장했습니다.', 'success');
    } catch (cause) {
      showErrorToast(cause);
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkPageFrame width="form">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">식당 운영·마감 설정</h1>
        <p className="mt-1 text-sm text-slate-500">
          휴무 요일·예외 휴무일을 달력으로 지정하고, 제공 식사와 신청 마감을 설정합니다. 기본은
          토·일 휴무입니다.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      ) : (
        <>
          <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">매주 휴무 요일</legend>
            <p className="text-xs text-slate-500">선택한 요일은 매주 식당을 운영하지 않습니다.</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_ORDER.map((wd) => {
                const active = draft.closedWeekdays.includes(wd);
                return (
                  <button
                    key={wd}
                    type="button"
                    onClick={() => setDraft((prev) => toggleClosedWeekday(prev, wd))}
                    className={`min-h-11 min-w-11 rounded-full border text-sm font-semibold ${
                      active
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                    aria-pressed={active}
                  >
                    {WEEKDAY_LABELS[wd]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-800">예외 휴무·개장 달력</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200"
                  onClick={() =>
                    setCalendarAnchor(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                  }
                  aria-label="이전 달"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="min-w-[6.5rem] text-center text-sm font-medium text-slate-800">
                  {calendarAnchor.getFullYear()}.{calendarAnchor.getMonth() + 1}
                </span>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200"
                  onClick={() =>
                    setCalendarAnchor(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                  aria-label="다음 달"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <MealSurveyMonthCalendar
              settings={draft}
              year={calendarAnchor.getFullYear()}
              monthIndex={calendarAnchor.getMonth()}
              interactiveHint="날짜를 누르면 휴무 ↔ 운영이 바뀝니다. 저장을 눌러 반영하세요."
              onSelectDate={(day) => {
                if (!day.isCurrentMonth) {
                  setCalendarAnchor(new Date(day.date.slice(0, 4), Number(day.date.slice(5, 7)) - 1, 1));
                }
                setDraft((prev) => toggleCafeteriaClosedDate(prev, day.date));
              }}
            />
            <ul className="space-y-1 text-xs text-slate-500">
              <li>
                추가 휴무 {draft.closedDates.length}일
                {draft.closedDates.length > 0 ? ` · ${draft.closedDates.slice(0, 5).join(', ')}${draft.closedDates.length > 5 ? '…' : ''}` : ''}
              </li>
              <li>
                예외 개장 {draft.openDates.length}일
                {draft.openDates.length > 0 ? ` · ${draft.openDates.slice(0, 5).join(', ')}${draft.openDates.length > 5 ? '…' : ''}` : ''}
              </li>
            </ul>
          </section>

          <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">제공 식사</legend>
            {(
              [
                ['offerBreakfast', '조식'],
                ['offerLunch', '중식'],
                ['offerDinner', '석식'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex min-h-11 items-center gap-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={draft[key]}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-3 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={draft.defaultEating}
                onChange={(e) => setDraft((prev) => ({ ...prev, defaultEating: e.target.checked }))}
              />
              운영일 기본 식사(기본 이용)
            </label>
          </fieldset>

          <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">끼니별 마감</legend>
            {(
              [
                ['breakfast', '조식', 'breakfastCutoffTime', 'breakfastCutoffPrevDay'],
                ['lunch', '중식', 'lunchCutoffTime', 'lunchCutoffPrevDay'],
                ['dinner', '석식', 'dinnerCutoffTime', 'dinnerCutoffPrevDay'],
              ] as const
            ).map(([, label, timeKey, prevKey]) => (
              <div key={timeKey} className="grid grid-cols-[1fr_auto] items-end gap-2">
                <label className="block text-sm text-slate-700">
                  {label} 마감 시각
                  <input
                    type="time"
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3"
                    value={draft[timeKey]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [timeKey]: e.target.value }))}
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2 pb-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={draft[prevKey]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [prevKey]: e.target.checked }))}
                  />
                  전일 기준
                </label>
              </div>
            ))}
          </fieldset>
        </>
      )}

      <button
        type="button"
        disabled={saving || loading}
        onClick={() => void handleSave()}
        className="min-h-12 w-full rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? '저장 중…' : '설정 저장'}
      </button>
    </WorkPageFrame>
  );
};

export const MealSurveySettingsPage: React.FC = () => (
  <MealSurveyManageGate>
    <MealSurveySettingsInner />
  </MealSurveyManageGate>
);
