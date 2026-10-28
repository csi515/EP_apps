-- 핵심 도메인 RPC (사내 PG SoT). 최소 동작·테넌트 가드. 상세 비즈니스는 후속 고도화.

CREATE OR REPLACE FUNCTION core.ensure_meal_survey_settings(p_org uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_row core.meal_survey_settings%ROWTYPE;
BEGIN
  IF NOT app.is_org_member(p_org) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_row FROM core.meal_survey_settings WHERE organization_id = p_org;
  IF NOT FOUND THEN
    INSERT INTO core.meal_survey_settings (organization_id)
    VALUES (p_org)
    RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

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
BEGIN
  SELECT * INTO v_act FROM core.volunteer_activities WHERE id = p_activity_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'activity not found'; END IF;
  IF NOT app.is_org_member(v_act.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id INTO v_member_id FROM core.organization_members
   WHERE organization_id = v_act.organization_id AND user_id = app.current_user_id()
     AND deleted_at IS NULL AND is_active = true
   LIMIT 1;
  INSERT INTO core.volunteer_signups (organization_id, activity_id, member_id)
  VALUES (v_act.organization_id, p_activity_id, v_member_id)
  ON CONFLICT (activity_id, member_id) DO NOTHING
  RETURNING id INTO v_signup_id;
  IF v_signup_id IS NULL THEN
    SELECT id INTO v_signup_id FROM core.volunteer_signups
    WHERE activity_id = p_activity_id AND member_id = v_member_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'signup_id', v_signup_id);
END;
$$;

CREATE OR REPLACE FUNCTION core.cancel_volunteer_signup(p_signup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM core.volunteer_signups WHERE id = p_signup_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT app.is_org_member(v_org) THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM core.volunteer_signups WHERE id = p_signup_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION core.process_approval_step_atomic(
  p_request_id uuid,
  p_action text,
  p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_req core.approval_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM core.approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF NOT app.is_org_member(v_req.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF lower(p_action) IN ('approve', 'approved') THEN
    UPDATE core.approval_requests
    SET status = 'approved', updated_at = now()
    WHERE id = p_request_id;
  ELSIF lower(p_action) IN ('reject', 'rejected') THEN
    UPDATE core.approval_requests
    SET status = 'rejected', updated_at = now()
    WHERE id = p_request_id;
  ELSE
    RAISE EXCEPTION 'unknown action';
  END IF;
  RETURN jsonb_build_object('ok', true, 'request_id', p_request_id, 'action', p_action, 'comment', p_comment);
END;
$$;

CREATE OR REPLACE FUNCTION core.revise_mbo_goal(
  p_objective_id uuid,
  p_title text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM core.mbo_objectives WHERE id = p_objective_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT app.is_org_member(v_org) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE core.mbo_objectives
  SET title = COALESCE(NULLIF(btrim(p_title), ''), title),
      updated_at = now()
  WHERE id = p_objective_id;
  RETURN jsonb_build_object('ok', true, 'objective_id', p_objective_id);
END;
$$;

GRANT EXECUTE ON FUNCTION core.ensure_meal_survey_settings(uuid) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.join_volunteer_activity(uuid) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.cancel_volunteer_signup(uuid) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.process_approval_step_atomic(uuid, text, text) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.revise_mbo_goal(uuid, text) TO app_user, authenticator;
