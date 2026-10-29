-- 식수인원 조사: 식당 비운영일(기본 토·일) + 예외 휴무/개장일

ALTER TABLE core.meal_survey_settings
  ADD COLUMN IF NOT EXISTS closed_weekdays SMALLINT[] NOT NULL DEFAULT ARRAY[0, 6]::SMALLINT[],
  ADD COLUMN IF NOT EXISTS closed_dates DATE[] NOT NULL DEFAULT ARRAY[]::DATE[],
  ADD COLUMN IF NOT EXISTS open_dates DATE[] NOT NULL DEFAULT ARRAY[]::DATE[];

COMMENT ON COLUMN core.meal_survey_settings.closed_weekdays IS
  '매주 휴무 요일. JS getDay 기준 0=일 … 6=토. 기본 {0,6}=일·토';
COMMENT ON COLUMN core.meal_survey_settings.closed_dates IS
  '추가 휴무일(공휴일·창립기념일 등)';
COMMENT ON COLUMN core.meal_survey_settings.open_dates IS
  '휴무 요일이라도 식당을 여는 예외 개장일';

-- 기존 짧은 시그니처가 있으면 제거하고 전체 인자 버전으로 통일
DROP FUNCTION IF EXISTS core.upsert_meal_survey_settings(
  uuid, boolean, boolean, boolean, boolean, time, boolean, time, boolean, time, boolean
);
DROP FUNCTION IF EXISTS core.upsert_meal_survey_settings(
  uuid, boolean, boolean, boolean
);

CREATE OR REPLACE FUNCTION core.upsert_meal_survey_settings(
  p_organization_id uuid,
  p_offer_breakfast boolean,
  p_offer_lunch boolean,
  p_offer_dinner boolean,
  p_default_eating boolean DEFAULT true,
  p_breakfast_cutoff_time time DEFAULT '17:00',
  p_breakfast_cutoff_prev_day boolean DEFAULT true,
  p_lunch_cutoff_time time DEFAULT '09:00',
  p_lunch_cutoff_prev_day boolean DEFAULT false,
  p_dinner_cutoff_time time DEFAULT '15:00',
  p_dinner_cutoff_prev_day boolean DEFAULT false,
  p_closed_weekdays smallint[] DEFAULT ARRAY[0, 6]::smallint[],
  p_closed_dates date[] DEFAULT ARRAY[]::date[],
  p_open_dates date[] DEFAULT ARRAY[]::date[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_row core.meal_survey_settings%ROWTYPE;
  v_weekdays smallint[];
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT (COALESCE(p_offer_breakfast, false) OR COALESCE(p_offer_lunch, false) OR COALESCE(p_offer_dinner, false)) THEN
    RAISE EXCEPTION 'at least one meal slot required';
  END IF;

  v_weekdays := COALESCE(p_closed_weekdays, ARRAY[0, 6]::smallint[]);
  IF cardinality(v_weekdays) >= 7 THEN
    RAISE EXCEPTION 'cannot close all weekdays';
  END IF;

  INSERT INTO core.meal_survey_settings AS s (
    organization_id,
    offer_breakfast,
    offer_lunch,
    offer_dinner,
    default_eating,
    breakfast_cutoff_time,
    breakfast_cutoff_prev_day,
    lunch_cutoff_time,
    lunch_cutoff_prev_day,
    dinner_cutoff_time,
    dinner_cutoff_prev_day,
    closed_weekdays,
    closed_dates,
    open_dates,
    updated_at
  ) VALUES (
    p_organization_id,
    COALESCE(p_offer_breakfast, false),
    COALESCE(p_offer_lunch, true),
    COALESCE(p_offer_dinner, false),
    COALESCE(p_default_eating, true),
    COALESCE(p_breakfast_cutoff_time, '17:00'::time),
    COALESCE(p_breakfast_cutoff_prev_day, true),
    COALESCE(p_lunch_cutoff_time, '09:00'::time),
    COALESCE(p_lunch_cutoff_prev_day, false),
    COALESCE(p_dinner_cutoff_time, '15:00'::time),
    COALESCE(p_dinner_cutoff_prev_day, false),
    v_weekdays,
    COALESCE(p_closed_dates, ARRAY[]::date[]),
    COALESCE(p_open_dates, ARRAY[]::date[]),
    now()
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    offer_breakfast = EXCLUDED.offer_breakfast,
    offer_lunch = EXCLUDED.offer_lunch,
    offer_dinner = EXCLUDED.offer_dinner,
    default_eating = EXCLUDED.default_eating,
    breakfast_cutoff_time = EXCLUDED.breakfast_cutoff_time,
    breakfast_cutoff_prev_day = EXCLUDED.breakfast_cutoff_prev_day,
    lunch_cutoff_time = EXCLUDED.lunch_cutoff_time,
    lunch_cutoff_prev_day = EXCLUDED.lunch_cutoff_prev_day,
    dinner_cutoff_time = EXCLUDED.dinner_cutoff_time,
    dinner_cutoff_prev_day = EXCLUDED.dinner_cutoff_prev_day,
    closed_weekdays = EXCLUDED.closed_weekdays,
    closed_dates = EXCLUDED.closed_dates,
    open_dates = EXCLUDED.open_dates,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION core.upsert_meal_survey_settings(
  uuid, boolean, boolean, boolean, boolean, time, boolean, time, boolean, time, boolean, smallint[], date[], date[]
) TO app_user, authenticator;
