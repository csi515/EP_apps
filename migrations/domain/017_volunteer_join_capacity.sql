-- 봉사활동 참여: open + 정원 미초과만 허용, 정원 도달 시 closed
-- 참여 취소: p_activity_id 기준(현재 사용자 signup 삭제). 구 p_signup_id 오버로드 제거.

CREATE OR REPLACE FUNCTION core.join_volunteer_activity(p_activity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_act core.volunteer_activities%ROWTYPE;
  v_member_id uuid;
  v_signup_id uuid;
  v_count integer;
  v_next_status text;
BEGIN
  SELECT * INTO v_act
  FROM core.volunteer_activities
  WHERE id = p_activity_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'activity not found';
  END IF;
  IF NOT app.is_org_member(v_act.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_act.status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'activity not open';
  END IF;

  SELECT id INTO v_member_id
  FROM core.organization_members
  WHERE organization_id = v_act.organization_id
    AND user_id = app.current_user_id()
    AND deleted_at IS NULL
    AND is_active = true
  LIMIT 1;
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  -- 이미 신청한 경우: 정원 검사 없이 멱등 성공
  SELECT id INTO v_signup_id
  FROM core.volunteer_signups
  WHERE activity_id = p_activity_id AND member_id = v_member_id;
  IF v_signup_id IS NOT NULL THEN
    SELECT count(*)::integer INTO v_count
    FROM core.volunteer_signups
    WHERE activity_id = p_activity_id;
    RETURN jsonb_build_object(
      'ok', true,
      'signup_id', v_signup_id,
      'signup_count', v_count,
      'status', v_act.status
    );
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM core.volunteer_signups
  WHERE activity_id = p_activity_id;
  IF v_count >= v_act.capacity THEN
    RAISE EXCEPTION 'activity full';
  END IF;

  INSERT INTO core.volunteer_signups (organization_id, activity_id, member_id)
  VALUES (v_act.organization_id, p_activity_id, v_member_id)
  RETURNING id INTO v_signup_id;

  SELECT count(*)::integer INTO v_count
  FROM core.volunteer_signups
  WHERE activity_id = p_activity_id;

  -- deriveVolunteerStatusAfterCount 와 동일: cancelled 유지, 정원 이상이면 closed, 아니면 open
  IF v_act.status = 'cancelled' THEN
    v_next_status := 'cancelled';
  ELSIF v_count >= v_act.capacity THEN
    v_next_status := 'closed';
  ELSE
    v_next_status := 'open';
  END IF;

  IF v_next_status IS DISTINCT FROM v_act.status THEN
    UPDATE core.volunteer_activities
    SET status = v_next_status, updated_at = now()
    WHERE id = p_activity_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'signup_id', v_signup_id,
    'signup_count', v_count,
    'status', v_next_status
  );
END;
$$;

DROP FUNCTION IF EXISTS core.cancel_volunteer_signup(uuid);

CREATE OR REPLACE FUNCTION core.cancel_volunteer_signup(p_activity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_act core.volunteer_activities%ROWTYPE;
  v_member_id uuid;
  v_deleted integer := 0;
  v_count integer;
  v_next_status text;
BEGIN
  SELECT * INTO v_act
  FROM core.volunteer_activities
  WHERE id = p_activity_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'activity not found';
  END IF;
  IF NOT app.is_org_member(v_act.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT id INTO v_member_id
  FROM core.organization_members
  WHERE organization_id = v_act.organization_id
    AND user_id = app.current_user_id()
    AND deleted_at IS NULL
    AND is_active = true
  LIMIT 1;
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  DELETE FROM core.volunteer_signups
  WHERE activity_id = p_activity_id
    AND member_id = v_member_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'signup not found';
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM core.volunteer_signups
  WHERE activity_id = p_activity_id;

  IF v_act.status = 'cancelled' THEN
    v_next_status := 'cancelled';
  ELSIF v_count >= v_act.capacity THEN
    v_next_status := 'closed';
  ELSE
    v_next_status := 'open';
  END IF;

  IF v_next_status IS DISTINCT FROM v_act.status THEN
    UPDATE core.volunteer_activities
    SET status = v_next_status, updated_at = now()
    WHERE id = p_activity_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'signup_count', v_count,
    'status', v_next_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.join_volunteer_activity(uuid) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.cancel_volunteer_signup(uuid) TO app_user, authenticator;
