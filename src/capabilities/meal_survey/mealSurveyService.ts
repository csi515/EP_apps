import { getCoreClient } from '@/lib/supabase';
import {
  DEFAULT_CLOSED_WEEKDAYS,
  DEFAULT_MEAL_SURVEY_SETTINGS,
  normalizeClosedWeekdays,
  type MealResponseStatus,
  type MealSlot,
  type MealSurveySettings,
  type WeekdayIndex,
} from './domain/mealSurveyEngine';

export type MealSurveySettingsRow = {
  organization_id: string;
  offer_breakfast: boolean;
  offer_lunch: boolean;
  offer_dinner: boolean;
  default_eating?: boolean;
  breakfast_cutoff_time?: string;
  breakfast_cutoff_prev_day?: boolean;
  lunch_cutoff_time?: string;
  lunch_cutoff_prev_day?: boolean;
  dinner_cutoff_time?: string;
  dinner_cutoff_prev_day?: boolean;
  closed_weekdays?: number[] | null;
  closed_dates?: string[] | null;
  open_dates?: string[] | null;
  updated_at?: string;
};

export type MealSurveyResponseRow = {
  id: string;
  organization_id: string;
  member_id: string;
  meal_date: string;
  meal_slot: MealSlot;
  status: MealResponseStatus;
  updated_at?: string;
};

export type MealSurveyOverview = {
  settings: {
    offer_breakfast: boolean;
    offer_lunch: boolean;
    offer_dinner: boolean;
    closed_weekdays?: number[];
    closed_dates?: string[];
    open_dates?: string[];
  };
  member_count: number;
  from: string;
  to: string;
  days: Array<{
    meal_date: string;
    meal_slot: MealSlot;
    eating_count: number;
    skipping_count: number;
    unset_count: number;
  }>;
  members: Array<{
    member_id: string;
    display_name: string;
    responses: Array<{
      meal_date: string;
      meal_slot: MealSlot;
      status: MealResponseStatus;
    }>;
  }>;
};

function timeFromRow(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.slice(0, 5);
}

function datesFromRow(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((d) => String(d).slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
}

export function settingsRowToDomain(row: MealSurveySettingsRow): MealSurveySettings {
  return {
    offerBreakfast: row.offer_breakfast,
    offerLunch: row.offer_lunch,
    offerDinner: row.offer_dinner,
    defaultEating: row.default_eating ?? DEFAULT_MEAL_SURVEY_SETTINGS.defaultEating,
    breakfastCutoffTime: timeFromRow(
      row.breakfast_cutoff_time,
      DEFAULT_MEAL_SURVEY_SETTINGS.breakfastCutoffTime
    ),
    breakfastCutoffPrevDay:
      row.breakfast_cutoff_prev_day ?? DEFAULT_MEAL_SURVEY_SETTINGS.breakfastCutoffPrevDay,
    lunchCutoffTime: timeFromRow(
      row.lunch_cutoff_time,
      DEFAULT_MEAL_SURVEY_SETTINGS.lunchCutoffTime
    ),
    lunchCutoffPrevDay:
      row.lunch_cutoff_prev_day ?? DEFAULT_MEAL_SURVEY_SETTINGS.lunchCutoffPrevDay,
    dinnerCutoffTime: timeFromRow(
      row.dinner_cutoff_time,
      DEFAULT_MEAL_SURVEY_SETTINGS.dinnerCutoffTime
    ),
    dinnerCutoffPrevDay:
      row.dinner_cutoff_prev_day ?? DEFAULT_MEAL_SURVEY_SETTINGS.dinnerCutoffPrevDay,
    closedWeekdays: normalizeClosedWeekdays(
      row.closed_weekdays ?? DEFAULT_CLOSED_WEEKDAYS
    ) as WeekdayIndex[],
    closedDates: datesFromRow(row.closed_dates),
    openDates: datesFromRow(row.open_dates),
  };
}

function normalizeSettingsRow(
  row: MealSurveySettingsRow,
  organizationId: string
): MealSurveySettingsRow {
  return {
    organization_id: row.organization_id ?? organizationId,
    offer_breakfast: Boolean(row.offer_breakfast),
    offer_lunch: Boolean(row.offer_lunch ?? true),
    offer_dinner: Boolean(row.offer_dinner),
    default_eating: row.default_eating ?? true,
    breakfast_cutoff_time: timeFromRow(row.breakfast_cutoff_time, '17:00'),
    breakfast_cutoff_prev_day: row.breakfast_cutoff_prev_day ?? true,
    lunch_cutoff_time: timeFromRow(row.lunch_cutoff_time, '09:00'),
    lunch_cutoff_prev_day: row.lunch_cutoff_prev_day ?? false,
    dinner_cutoff_time: timeFromRow(row.dinner_cutoff_time, '15:00'),
    dinner_cutoff_prev_day: row.dinner_cutoff_prev_day ?? false,
    closed_weekdays: normalizeClosedWeekdays(row.closed_weekdays ?? DEFAULT_CLOSED_WEEKDAYS),
    closed_dates: datesFromRow(row.closed_dates),
    open_dates: datesFromRow(row.open_dates),
    updated_at: row.updated_at,
  };
}

export async function ensureMealSurveySettings(
  organizationId: string
): Promise<MealSurveySettingsRow> {
  const client = getCoreClient();
  const { data, error } = await (client as any).rpc('ensure_meal_survey_settings', {
    p_org: organizationId,
  });
  if (error) throw new Error(error.message);
  return normalizeSettingsRow(data as MealSurveySettingsRow, organizationId);
}

export async function upsertMealSurveySettings(
  organizationId: string,
  settings: MealSurveySettings
): Promise<MealSurveySettingsRow> {
  const client = getCoreClient();
  const { data, error } = await (client as any).rpc('upsert_meal_survey_settings', {
    p_organization_id: organizationId,
    p_offer_breakfast: settings.offerBreakfast,
    p_offer_lunch: settings.offerLunch,
    p_offer_dinner: settings.offerDinner,
    p_default_eating: settings.defaultEating,
    p_breakfast_cutoff_time: settings.breakfastCutoffTime,
    p_breakfast_cutoff_prev_day: settings.breakfastCutoffPrevDay,
    p_lunch_cutoff_time: settings.lunchCutoffTime,
    p_lunch_cutoff_prev_day: settings.lunchCutoffPrevDay,
    p_dinner_cutoff_time: settings.dinnerCutoffTime,
    p_dinner_cutoff_prev_day: settings.dinnerCutoffPrevDay,
    p_closed_weekdays: normalizeClosedWeekdays(settings.closedWeekdays),
    p_closed_dates: settings.closedDates,
    p_open_dates: settings.openDates,
  });
  if (error) throw new Error(error.message);
  return normalizeSettingsRow(data as MealSurveySettingsRow, organizationId);
}

export async function listMyMealSurveyResponses(
  organizationId: string,
  memberId: string,
  from: string,
  to: string
): Promise<MealSurveyResponseRow[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('meal_survey_responses')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('member_id', memberId)
    .gte('meal_date', from)
    .lte('meal_date', to)
    .order('meal_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as MealSurveyResponseRow[];
}

export async function upsertMealSurveyResponse(input: {
  organizationId: string;
  mealDate: string;
  mealSlot: MealSlot;
  status: MealResponseStatus;
}): Promise<Record<string, unknown>> {
  const client = getCoreClient();
  const { data, error } = await (client as any).rpc('upsert_meal_survey_response', {
    p_organization_id: input.organizationId,
    p_meal_date: input.mealDate,
    p_meal_slot: input.mealSlot,
    p_status: input.status,
  });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

export async function clearMealSurveyResponse(input: {
  organizationId: string;
  mealDate: string;
  mealSlot: MealSlot;
}): Promise<Record<string, unknown>> {
  const client = getCoreClient();
  const { data, error } = await (client as any).rpc('clear_meal_survey_response', {
    p_organization_id: input.organizationId,
    p_meal_date: input.mealDate,
    p_meal_slot: input.mealSlot,
  });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

export async function bulkSkipMealSurveyRange(input: {
  organizationId: string;
  from: string;
  to: string;
}): Promise<{ skipped_cells: number }> {
  const client = getCoreClient();
  const { data, error } = await (client as any).rpc('bulk_skip_meal_survey_range', {
    p_organization_id: input.organizationId,
    p_from: input.from,
    p_to: input.to,
  });
  if (error) throw new Error(error.message);
  return (data ?? { skipped_cells: 0 }) as { skipped_cells: number };
}

export async function listMealSurveyOverview(
  organizationId: string,
  from: string,
  to: string
): Promise<MealSurveyOverview> {
  const client = getCoreClient();
  const { data, error } = await (client as any).rpc('list_meal_survey_overview', {
    p_organization_id: organizationId,
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error(error.message);
  return (data ?? {
    settings: {
      offer_breakfast: false,
      offer_lunch: true,
      offer_dinner: false,
      closed_weekdays: [...DEFAULT_CLOSED_WEEKDAYS],
      closed_dates: [],
      open_dates: [],
    },
    member_count: 0,
    from,
    to,
    days: [],
    members: [],
  }) as MealSurveyOverview;
}
