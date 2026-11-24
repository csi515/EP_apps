-- 본인 행 CRUD 수평전개: 개인 셀프서비스 + 작성자 워크플로 RLS
-- 조직 공용 마스터(재고·노선·캠페인 설정 등)는 제외

-- ---------------------------------------------------------------------------
-- 헬퍼
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.current_org_member_id(p_org uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT m.id
  FROM core.organization_members m
  WHERE m.organization_id = p_org
    AND m.user_id = app.current_user_id()
    AND m.is_active = true
    AND m.deleted_at IS NULL
  ORDER BY m.created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app.is_own_org_member_row(p_org uuid, p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    WHERE m.id = p_member_id
      AND m.organization_id = p_org
      AND m.user_id = app.current_user_id()
      AND m.is_active = true
      AND m.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION core.can_manage_shuttle(p_org uuid)
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
        OR COALESCE((r.permissions->>'shuttle:manage')::boolean, false)
        OR COALESCE((m.feature_permissions->>'shuttle:manage')::boolean, false)
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.can_manage_risk_assessments(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT app.is_org_admin_or_owner(p_org)
    OR EXISTS (
      SELECT 1
      FROM core.organization_members m
      WHERE m.organization_id = p_org
        AND m.user_id = app.current_user_id()
        AND m.is_active = true
        AND m.deleted_at IS NULL
        AND m.role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION core.can_manage_approvals(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT app.is_org_admin_or_owner(p_org)
    OR EXISTS (
      SELECT 1
      FROM core.organization_members m
      LEFT JOIN core.organization_roles r ON r.id = m.organization_role_id
      WHERE m.organization_id = p_org
        AND m.user_id = app.current_user_id()
        AND m.is_active = true
        AND m.deleted_at IS NULL
        AND (
          m.role IN ('owner', 'admin')
          OR COALESCE((r.permissions->>'approval_workflow:manage')::boolean, false)
          OR COALESCE((m.feature_permissions->>'approval_workflow:manage')::boolean, false)
        )
    );
$$;

GRANT EXECUTE ON FUNCTION app.current_org_member_id(uuid) TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION app.is_own_org_member_row(uuid, uuid) TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.can_manage_shuttle(uuid) TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.can_manage_risk_assessments(uuid) TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.can_manage_approvals(uuid) TO app_user, app_admin, authenticator;

-- ---------------------------------------------------------------------------
-- meal_survey_responses: SELECT/쓰기 = 본인 or manage
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.meal_survey_responses;
DROP POLICY IF EXISTS meal_survey_responses_select ON core.meal_survey_responses;
DROP POLICY IF EXISTS meal_survey_responses_insert ON core.meal_survey_responses;
DROP POLICY IF EXISTS meal_survey_responses_update ON core.meal_survey_responses;
DROP POLICY IF EXISTS meal_survey_responses_delete ON core.meal_survey_responses;

CREATE POLICY meal_survey_responses_select ON core.meal_survey_responses
  FOR SELECT TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_meal_survey(organization_id)
    )
  );

CREATE POLICY meal_survey_responses_insert ON core.meal_survey_responses
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_meal_survey(organization_id)
    )
  );

CREATE POLICY meal_survey_responses_update ON core.meal_survey_responses
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_meal_survey(organization_id)
    )
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_meal_survey(organization_id)
    )
  );

CREATE POLICY meal_survey_responses_delete ON core.meal_survey_responses
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_meal_survey(organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- office_supply_request_lines
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.office_supply_request_lines;
DROP POLICY IF EXISTS office_supply_request_lines_select ON core.office_supply_request_lines;
DROP POLICY IF EXISTS office_supply_request_lines_insert ON core.office_supply_request_lines;
DROP POLICY IF EXISTS office_supply_request_lines_update ON core.office_supply_request_lines;
DROP POLICY IF EXISTS office_supply_request_lines_delete ON core.office_supply_request_lines;

CREATE POLICY office_supply_request_lines_select ON core.office_supply_request_lines
  FOR SELECT TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_office_supply_request(organization_id)
    )
  );

CREATE POLICY office_supply_request_lines_insert ON core.office_supply_request_lines
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_office_supply_request(organization_id)
    )
  );

CREATE POLICY office_supply_request_lines_update ON core.office_supply_request_lines
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_office_supply_request(organization_id)
    )
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_office_supply_request(organization_id)
    )
  );

CREATE POLICY office_supply_request_lines_delete ON core.office_supply_request_lines
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_office_supply_request(organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- volunteer_signups: SELECT는 정원 표시용 조직 공개, 쓰기는 본인/manage
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.volunteer_signups;
DROP POLICY IF EXISTS volunteer_signups_select ON core.volunteer_signups;
DROP POLICY IF EXISTS volunteer_signups_insert ON core.volunteer_signups;
DROP POLICY IF EXISTS volunteer_signups_update ON core.volunteer_signups;
DROP POLICY IF EXISTS volunteer_signups_delete ON core.volunteer_signups;

CREATE POLICY volunteer_signups_select ON core.volunteer_signups
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY volunteer_signups_insert ON core.volunteer_signups
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_volunteer(organization_id)
    )
  );

CREATE POLICY volunteer_signups_update ON core.volunteer_signups
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_volunteer(organization_id)
    )
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_volunteer(organization_id)
    )
  );

CREATE POLICY volunteer_signups_delete ON core.volunteer_signups
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_volunteer(organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- shuttle_registrations: SELECT 조직 공개(정원), 쓰기는 본인/manage
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.shuttle_registrations;
DROP POLICY IF EXISTS shuttle_registrations_select ON core.shuttle_registrations;
DROP POLICY IF EXISTS shuttle_registrations_insert ON core.shuttle_registrations;
DROP POLICY IF EXISTS shuttle_registrations_update ON core.shuttle_registrations;
DROP POLICY IF EXISTS shuttle_registrations_delete ON core.shuttle_registrations;

CREATE POLICY shuttle_registrations_select ON core.shuttle_registrations
  FOR SELECT TO app_user
  USING (app.is_org_member(tenant_id));

CREATE POLICY shuttle_registrations_insert ON core.shuttle_registrations
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(tenant_id)
    AND (
      app.is_own_org_member_row(tenant_id, member_id)
      OR core.can_manage_shuttle(tenant_id)
    )
  );

CREATE POLICY shuttle_registrations_update ON core.shuttle_registrations
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(tenant_id)
    AND (
      app.is_own_org_member_row(tenant_id, member_id)
      OR core.can_manage_shuttle(tenant_id)
    )
  )
  WITH CHECK (
    app.is_org_member(tenant_id)
    AND (
      app.is_own_org_member_row(tenant_id, member_id)
      OR core.can_manage_shuttle(tenant_id)
    )
  );

CREATE POLICY shuttle_registrations_delete ON core.shuttle_registrations
  FOR DELETE TO app_user
  USING (
    app.is_org_member(tenant_id)
    AND (
      app.is_own_org_member_row(tenant_id, member_id)
      OR core.can_manage_shuttle(tenant_id)
    )
  );

-- ---------------------------------------------------------------------------
-- risk_assessments: SELECT 조직 공개, 작성자 DRAFT 쓰기 or manage
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.risk_assessments;
DROP POLICY IF EXISTS risk_assessments_select ON core.risk_assessments;
DROP POLICY IF EXISTS risk_assessments_insert ON core.risk_assessments;
DROP POLICY IF EXISTS risk_assessments_update ON core.risk_assessments;
DROP POLICY IF EXISTS risk_assessments_delete ON core.risk_assessments;

CREATE POLICY risk_assessments_select ON core.risk_assessments
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY risk_assessments_insert ON core.risk_assessments
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND created_by = app.current_user_id()
  );

CREATE POLICY risk_assessments_update ON core.risk_assessments
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      core.can_manage_risk_assessments(organization_id)
      OR (created_by = app.current_user_id() AND status = 'DRAFT')
    )
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      core.can_manage_risk_assessments(organization_id)
      OR (created_by = app.current_user_id() AND status = 'DRAFT')
    )
  );

CREATE POLICY risk_assessments_delete ON core.risk_assessments
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      core.can_manage_risk_assessments(organization_id)
      OR (created_by = app.current_user_id() AND status = 'DRAFT')
    )
  );

-- ---------------------------------------------------------------------------
-- approval_requests: 기안자/결재선/관리자 SELECT, 기안자 draft·pending 쓰기
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.approval_requests;
DROP POLICY IF EXISTS approval_requests_select ON core.approval_requests;
DROP POLICY IF EXISTS approval_requests_insert ON core.approval_requests;
DROP POLICY IF EXISTS approval_requests_update ON core.approval_requests;
DROP POLICY IF EXISTS approval_requests_delete ON core.approval_requests;

CREATE POLICY approval_requests_select ON core.approval_requests
  FOR SELECT TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      core.can_manage_approvals(organization_id)
      OR requester_id = app.current_user_id()
      OR EXISTS (
        SELECT 1
        FROM core.approval_steps s
        WHERE s.request_id = approval_requests.id
          AND s.approver_id = app.current_user_id()
      )
    )
  );

CREATE POLICY approval_requests_insert ON core.approval_requests
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      requester_id = app.current_user_id()
      OR core.can_manage_approvals(organization_id)
    )
  );

CREATE POLICY approval_requests_update ON core.approval_requests
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      core.can_manage_approvals(organization_id)
      OR (
        requester_id = app.current_user_id()
        AND status IN ('draft', 'pending')
      )
    )
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      core.can_manage_approvals(organization_id)
      OR (
        requester_id = app.current_user_id()
        AND status IN ('draft', 'pending', 'canceled')
      )
    )
  );

CREATE POLICY approval_requests_delete ON core.approval_requests
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      core.can_manage_approvals(organization_id)
      OR (requester_id = app.current_user_id() AND status = 'draft')
    )
  );

-- ---------------------------------------------------------------------------
-- 기안자 자진 회수 RPC (pending → canceled, 스텝 skipped)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.cancel_approval_request_by_requester(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_req core.approval_requests%ROWTYPE;
  v_actor uuid := app.current_user_id();
  v_allow boolean;
  v_settings jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_req FROM core.approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'REQUEST_NOT_FOUND');
  END IF;

  IF NOT app.is_org_member(v_req.organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  IF v_req.requester_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_REQUESTER');
  END IF;

  IF v_req.status IS DISTINCT FROM 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'REQUEST_NOT_PENDING');
  END IF;

  SELECT COALESCE(o.settings, '{}'::jsonb) INTO v_settings
  FROM core.organizations o
  WHERE o.id = v_req.organization_id;

  -- setupSchema defaultValue=true: 키 없으면 허용
  v_allow := COALESCE((v_settings->>'allow_requester_cancel')::boolean, true);
  IF NOT v_allow THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANCEL_DISABLED');
  END IF;

  UPDATE core.approval_requests
  SET status = 'canceled',
      updated_at = now()
  WHERE id = p_request_id;

  UPDATE core.approval_steps
  SET status = 'skipped',
      comment = COALESCE(comment, '기안자 자진 회수'),
      processed_at = COALESCE(processed_at, now())
  WHERE request_id = p_request_id
    AND status IN ('waiting', 'pending');

  RETURN jsonb_build_object('success', true, 'status', 'canceled');
END;
$$;

GRANT EXECUTE ON FUNCTION core.cancel_approval_request_by_requester(uuid) TO app_user, authenticator;

COMMENT ON FUNCTION app.current_org_member_id(uuid) IS '현재 세션 사용자의 조직 멤버 id';
COMMENT ON FUNCTION core.cancel_approval_request_by_requester(uuid) IS
  '기안자 자진 회수: pending만, organizations.settings.allow_requester_cancel(기본 true)';
