-- 식수인원 조사: 응답 upsert/clear/bulk_skip/overview + 권한·컷오프 가드

CREATE OR REPLACE FUNCTION core.can_manage_meal_survey(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    LEFT JOIN core.organization_roles r ON r.id = m.organization_role_id
    WHERE m.organization_id = p_org
      AND m.user_id = app.current_user_id()
      AND m.is_active = true
      AND m.deleted_at IS NULL
      AND (
        m.role IN ('owner', 'admin')
        OR app.is_org_admin_or_owner(p_org)
        OR COALESCE((r.permissions->>'meal_survey:manage')::boolean, false)
        OR COALESCE((m.feature_permissions->>'meal_survey:manage')::boolean, false)
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.meal_survey_slot_writable(
  p_org uuid,
  p_meal_date date,
  p_meal_slot text,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_s core.meal_survey_settings%ROWTYPE;
  v_offered boolean := false;
  v_closed boolean := false;
  v_cutoff_time time;
  v_prev_day boolean;
  v_cutoff_at timestamptz;
  v_weekday smallint;
BEGIN
  SELECT * INTO v_s FROM core.meal_survey_settings WHERE organization_id = p_org;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_meal_slot = 'breakfast' THEN
    v_offered := v_s.offer_breakfast;
    v_cutoff_time := v_s.breakfast_cutoff_time;
    v_prev_day := v_s.breakfast_cutoff_prev_day;
  ELSIF p_meal_slot = 'lunch' THEN
    v_offered := v_s.offer_lunch;
    v_cutoff_time := v_s.lunch_cutoff_time;
    v_prev_day := v_s.lunch_cutoff_prev_day;
  ELSIF p_meal_slot = 'dinner' THEN
    v_offered := v_s.offer_dinner;
    v_cutoff_time := v_s.dinner_cutoff_time;
    v_prev_day := v_s.dinner_cutoff_prev_day;
  ELSE
    RETURN false;
  END IF;

  IF NOT v_offered THEN
    RETURN false;
  END IF;

  -- 예외 개장일 우선, 그다음 휴무일·휴무 요일
  IF p_meal_date = ANY (COALESCE(v_s.open_dates, ARRAY[]::date[])) THEN
    v_closed := false;
  ELSIF p_meal_date = ANY (COALESCE(v_s.closed_dates, ARRAY[]::date[])) THEN
    v_closed := true;
  ELSE
    v_weekday := EXTRACT(DOW FROM p_meal_date)::smallint; -- 0=일 … 6=토
    v_closed := v_weekday = ANY (COALESCE(v_s.closed_weekdays, ARRAY[0, 6]::smallint[]));
  END IF;
  IF v_closed THEN
    RETURN false;
  END IF;

  v_cutoff_at := (p_meal_date::timestamp + v_cutoff_time)::timestamptz;
  IF v_prev_day THEN
    v_cutoff_at := v_cutoff_at - interval '1 day';
  END IF;

  RETURN p_now < v_cutoff_at;
END;
$$;

CREATE OR REPLACE FUNCTION core.upsert_meal_survey_response(
  p_organization_id uuid,
  p_meal_date date,
  p_meal_slot text,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_member_id uuid;
  v_row core.meal_survey_responses%ROWTYPE;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_status NOT IN ('eating', 'skipping') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  IF p_meal_slot NOT IN ('breakfast', 'lunch', 'dinner') THEN
    RAISE EXCEPTION 'invalid meal_slot';
  END IF;
  IF NOT core.meal_survey_slot_writable(p_organization_id, p_meal_date, p_meal_slot, now()) THEN
    RAISE EXCEPTION 'meal slot not writable';
  END IF;

  SELECT id INTO v_member_id
  FROM core.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = app.current_user_id()
    AND deleted_at IS NULL
    AND is_active = true
  LIMIT 1;
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  INSERT INTO core.meal_survey_responses AS r (
    organization_id, member_id, meal_date, meal_slot, status, updated_at
  ) VALUES (
    p_organization_id, v_member_id, p_meal_date, p_meal_slot, p_status, now()
  )
  ON CONFLICT (member_id, meal_date, meal_slot) DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION core.clear_meal_survey_response(
  p_organization_id uuid,
  p_meal_date date,
  p_meal_slot text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_member_id uuid;
  v_deleted integer := 0;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT core.meal_survey_slot_writable(p_organization_id, p_meal_date, p_meal_slot, now()) THEN
    RAISE EXCEPTION 'meal slot not writable';
  END IF;

  SELECT id INTO v_member_id
  FROM core.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = app.current_user_id()
    AND deleted_at IS NULL
    AND is_active = true
  LIMIT 1;
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  DELETE FROM core.meal_survey_responses
  WHERE organization_id = p_organization_id
    AND member_id = v_member_id
    AND meal_date = p_meal_date
    AND meal_slot = p_meal_slot;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'deleted', v_deleted);
END;
$$;

CREATE OR REPLACE FUNCTION core.bulk_skip_meal_survey_range(
  p_organization_id uuid,
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_member_id uuid;
  v_s core.meal_survey_settings%ROWTYPE;
  v_day date;
  v_slot text;
  v_count integer := 0;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
    RAISE EXCEPTION 'invalid range';
  END IF;

  SELECT id INTO v_member_id
  FROM core.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = app.current_user_id()
    AND deleted_at IS NULL
    AND is_active = true
  LIMIT 1;
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  PERFORM core.ensure_meal_survey_settings(p_organization_id);
  SELECT * INTO v_s FROM core.meal_survey_settings WHERE organization_id = p_organization_id;

  v_day := p_from;
  WHILE v_day <= p_to LOOP
    FOREACH v_slot IN ARRAY ARRAY['breakfast', 'lunch', 'dinner']::text[] LOOP
      IF core.meal_survey_slot_writable(p_organization_id, v_day, v_slot, now()) THEN
        INSERT INTO core.meal_survey_responses AS r (
          organization_id, member_id, meal_date, meal_slot, status, updated_at
        ) VALUES (
          p_organization_id, v_member_id, v_day, v_slot, 'skipping', now()
        )
        ON CONFLICT (member_id, meal_date, meal_slot) DO UPDATE SET
          status = 'skipping',
          updated_at = now();
        v_count := v_count + 1;
      END IF;
    END LOOP;
    v_day := v_day + 1;
  END LOOP;

  RETURN jsonb_build_object('skipped_cells', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION core.list_meal_survey_overview(
  p_organization_id uuid,
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_s core.meal_survey_settings%ROWTYPE;
  v_member_count integer;
  v_days jsonb;
  v_members jsonb;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT core.can_manage_meal_survey(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
    RAISE EXCEPTION 'invalid range';
  END IF;

  PERFORM core.ensure_meal_survey_settings(p_organization_id);
  SELECT * INTO v_s FROM core.meal_survey_settings WHERE organization_id = p_organization_id;

  SELECT count(*)::integer INTO v_member_count
  FROM core.organization_members m
  WHERE m.organization_id = p_organization_id
    AND m.deleted_at IS NULL
    AND m.is_active = true;

  SELECT COALESCE(jsonb_agg(to_jsonb(day_row) ORDER BY day_row.meal_date, day_row.meal_slot), '[]'::jsonb)
  INTO v_days
  FROM (
    SELECT
      d.meal_date,
      s.meal_slot,
      count(*) FILTER (WHERE r.status = 'eating')::integer AS eating_count,
      count(*) FILTER (WHERE r.status = 'skipping')::integer AS skipping_count,
      GREATEST(
        0,
        v_member_count
          - count(*) FILTER (WHERE r.status = 'eating')::integer
          - count(*) FILTER (WHERE r.status = 'skipping')::integer
      ) AS unset_count
    FROM generate_series(p_from, p_to, interval '1 day') AS g(d)
    CROSS JOIN LATERAL (
      SELECT g.d::date AS meal_date
    ) d
    CROSS JOIN LATERAL (
      SELECT unnest(
        ARRAY_REMOVE(ARRAY[
          CASE WHEN v_s.offer_breakfast THEN 'breakfast' END,
          CASE WHEN v_s.offer_lunch THEN 'lunch' END,
          CASE WHEN v_s.offer_dinner THEN 'dinner' END
        ], NULL)
      ) AS meal_slot
    ) s
    LEFT JOIN core.meal_survey_responses r
      ON r.organization_id = p_organization_id
     AND r.meal_date = d.meal_date
     AND r.meal_slot = s.meal_slot
    GROUP BY d.meal_date, s.meal_slot
  ) day_row;

  SELECT COALESCE(jsonb_agg(to_jsonb(mem_row) ORDER BY mem_row.display_name, mem_row.member_id), '[]'::jsonb)
  INTO v_members
  FROM (
    SELECT
      m.id AS member_id,
      COALESCE(NULLIF(btrim(st.name), ''), NULLIF(btrim(u.full_name), ''), u.email, m.id::text) AS display_name,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'meal_date', r.meal_date,
              'meal_slot', r.meal_slot,
              'status', r.status
            )
            ORDER BY r.meal_date, r.meal_slot
          )
          FROM core.meal_survey_responses r
          WHERE r.organization_id = p_organization_id
            AND r.member_id = m.id
            AND r.meal_date BETWEEN p_from AND p_to
        ),
        '[]'::jsonb
      ) AS responses
    FROM core.organization_members m
    JOIN app.users u ON u.id = m.user_id
    LEFT JOIN core.staff st ON st.id = m.staff_id
    WHERE m.organization_id = p_organization_id
      AND m.deleted_at IS NULL
      AND m.is_active = true
  ) mem_row;

  RETURN jsonb_build_object(
    'settings', jsonb_build_object(
      'offer_breakfast', v_s.offer_breakfast,
      'offer_lunch', v_s.offer_lunch,
      'offer_dinner', v_s.offer_dinner,
      'closed_weekdays', to_jsonb(COALESCE(v_s.closed_weekdays, ARRAY[0, 6]::smallint[])),
      'closed_dates', to_jsonb(COALESCE(v_s.closed_dates, ARRAY[]::date[])),
      'open_dates', to_jsonb(COALESCE(v_s.open_dates, ARRAY[]::date[]))
    ),
    'member_count', v_member_count,
    'from', p_from,
    'to', p_to,
    'days', v_days,
    'members', v_members
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.can_manage_meal_survey(uuid) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.meal_survey_slot_writable(uuid, date, text, timestamptz) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.upsert_meal_survey_response(uuid, date, text, text) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.clear_meal_survey_response(uuid, date, text) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.bulk_skip_meal_survey_range(uuid, date, date) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.list_meal_survey_overview(uuid, date, date) TO app_user, authenticator;
