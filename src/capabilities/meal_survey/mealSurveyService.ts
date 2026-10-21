import { getCoreClient } from '@/lib/supabase';
import type { MealResponseStatus, MealSlot, MealSurveySettings } from './domain/mealSurveyEngine';

export type MealSurveySettingsRow = {
  organization_id: string;
  offer_breakfast: boolean;
  offer_lunch: boolean;
  offer_dinner: boolean;
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

export function settingsRowToDomain(row: MealSurveySettingsRow): MealSurveySettings {
  return {
    offerBreakfast: row.offer_breakfast,
    offerLunch: row.offer_lunch,
    offerDinner: row.offer_dinner,
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
  const row = data as MealSurveySettingsRow;
  return {
    organization_id: row.organization_id ?? organizationId,
    offer_breakfast: Boolean(row.offer_breakfast),
    offer_lunch: Boolean(row.offer_lunch ?? true),
    offer_dinner: Boolean(row.offer_dinner),
    updated_at: row.updated_at,
  };
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
  });
  if (error) throw new Error(error.message);
  const row = data as MealSurveySettingsRow;
  return {
    organization_id: row.organization_id ?? organizationId,
    offer_breakfast: Boolean(row.offer_breakfast),
    offer_lunch: Boolean(row.offer_lunch),
    offer_dinner: Boolean(row.offer_dinner),
    updated_at: row.updated_at,
  };
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
    settings: { offer_breakfast: false, offer_lunch: true, offer_dinner: false },
    member_count: 0,
    from,
    to,
    days: [],
    members: [],
  }) as MealSurveyOverview;
}
