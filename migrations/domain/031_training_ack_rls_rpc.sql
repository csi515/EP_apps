-- 교육관리: can_manage + RLS 강화 + acknowledge RPC (재이수 포함)

CREATE OR REPLACE FUNCTION core.can_manage_training_ack(p_org uuid)
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
        OR COALESCE((r.permissions->>'training_ack:manage')::boolean, false)
        OR COALESCE((m.feature_permissions->>'training_ack:manage')::boolean, false)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION core.can_manage_training_ack(uuid)
  TO app_user, app_admin, authenticator;

COMMENT ON FUNCTION core.can_manage_training_ack(uuid) IS
  '교육관리 담당(training_ack:manage) 또는 org admin/owner';

-- ---------------------------------------------------------------------------
-- training_courses
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS training_courses_all ON core.training_courses;
DROP POLICY IF EXISTS training_courses_select ON core.training_courses;
DROP POLICY IF EXISTS training_courses_insert ON core.training_courses;
DROP POLICY IF EXISTS training_courses_update ON core.training_courses;
DROP POLICY IF EXISTS training_courses_delete ON core.training_courses;

CREATE POLICY training_courses_select ON core.training_courses
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY training_courses_insert ON core.training_courses
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_training_ack(organization_id)
  );

CREATE POLICY training_courses_update ON core.training_courses
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_training_ack(organization_id)
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_training_ack(organization_id)
  );

CREATE POLICY training_courses_delete ON core.training_courses
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_training_ack(organization_id)
  );

-- ---------------------------------------------------------------------------
-- training_assignees
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS training_assignees_all ON core.training_assignees;
DROP POLICY IF EXISTS training_assignees_select ON core.training_assignees;
DROP POLICY IF EXISTS training_assignees_insert ON core.training_assignees;
DROP POLICY IF EXISTS training_assignees_update ON core.training_assignees;
DROP POLICY IF EXISTS training_assignees_delete ON core.training_assignees;

CREATE POLICY training_assignees_select ON core.training_assignees
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY training_assignees_insert ON core.training_assignees
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_training_ack(organization_id)
  );

CREATE POLICY training_assignees_update ON core.training_assignees
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_training_ack(organization_id)
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_training_ack(organization_id)
  );

CREATE POLICY training_assignees_delete ON core.training_assignees
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_training_ack(organization_id)
  );

-- ---------------------------------------------------------------------------
-- training_acknowledgments
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS training_acknowledgments_all ON core.training_acknowledgments;
DROP POLICY IF EXISTS training_acknowledgments_select ON core.training_acknowledgments;
DROP POLICY IF EXISTS training_acknowledgments_insert ON core.training_acknowledgments;
DROP POLICY IF EXISTS training_acknowledgments_update ON core.training_acknowledgments;
DROP POLICY IF EXISTS training_acknowledgments_delete ON core.training_acknowledgments;

CREATE POLICY training_acknowledgments_select ON core.training_acknowledgments
  FOR SELECT TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.is_own_org_member_row(organization_id, member_id)
      OR core.can_manage_training_ack(organization_id)
    )
  );

CREATE POLICY training_acknowledgments_insert ON core.training_acknowledgments
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND app.is_own_org_member_row(organization_id, member_id)
  );

CREATE POLICY training_acknowledgments_update ON core.training_acknowledgments
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND app.is_own_org_member_row(organization_id, member_id)
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND app.is_own_org_member_row(organization_id, member_id)
  );

CREATE POLICY training_acknowledgments_delete ON core.training_acknowledgments
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_training_ack(organization_id)
  );

-- ---------------------------------------------------------------------------
-- RPC: 이수 확인 (acked_at = now). 구개정이면 동일 행 UPDATE.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.acknowledge_training_course(
  p_organization_id uuid,
  p_course_id uuid,
  p_user_agent text DEFAULT NULL
)
RETURNS core.training_acknowledgments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_member uuid;
  v_course core.training_courses%ROWTYPE;
  v_assigned boolean := false;
  v_existing core.training_acknowledgments%ROWTYPE;
  v_row core.training_acknowledgments%ROWTYPE;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_member := app.current_org_member_id(p_organization_id);
  IF v_member IS NULL THEN
    RAISE EXCEPTION 'not a member';
  END IF;

  SELECT * INTO v_course
  FROM core.training_courses
  WHERE id = p_course_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;

  IF v_course.status <> 'published' THEN
    RAISE EXCEPTION 'not published';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM core.training_assignees a
    WHERE a.organization_id = p_organization_id
      AND a.course_id = p_course_id
      AND (
        a.member_id = v_member
        OR (
          a.department_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM core.department_members dm
            WHERE dm.organization_id = p_organization_id
              AND dm.member_id = v_member
              AND dm.department_id = a.department_id
          )
        )
      )
  ) INTO v_assigned;

  IF NOT v_assigned THEN
    RAISE EXCEPTION 'not assigned';
  END IF;

  SELECT * INTO v_existing
  FROM core.training_acknowledgments
  WHERE organization_id = p_organization_id
    AND course_id = p_course_id
    AND member_id = v_member;

  IF FOUND THEN
    IF v_existing.course_revision >= v_course.revision THEN
      RAISE EXCEPTION 'already acknowledged';
    END IF;

    UPDATE core.training_acknowledgments
    SET
      course_revision = v_course.revision,
      acked_at = now(),
      user_agent = NULLIF(btrim(COALESCE(p_user_agent, '')), '')
    WHERE id = v_existing.id
    RETURNING * INTO v_row;

    RETURN v_row;
  END IF;

  INSERT INTO core.training_acknowledgments (
    organization_id,
    course_id,
    member_id,
    course_revision,
    acked_at,
    user_agent
  ) VALUES (
    p_organization_id,
    p_course_id,
    v_member,
    v_course.revision,
    now(),
    NULLIF(btrim(COALESCE(p_user_agent, '')), '')
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION core.acknowledge_training_course(uuid, uuid, text)
  TO app_user, app_admin, authenticator;

COMMENT ON FUNCTION core.acknowledge_training_course(uuid, uuid, text) IS
  '교육 이수 확인. published+배정 검증. 구개정이면 acked_at 갱신.';

-- ---------------------------------------------------------------------------
-- RPC: 배정 일괄 교체 (delete + insert 원자)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.replace_training_assignees(
  p_organization_id uuid,
  p_course_id uuid,
  p_assignees jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_item jsonb;
  v_dept uuid;
  v_member uuid;
  v_has_dept boolean;
  v_has_member boolean;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT core.can_manage_training_ack(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM core.training_courses
    WHERE id = p_course_id
      AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'not found';
  END IF;

  IF p_assignees IS NULL OR jsonb_typeof(p_assignees) <> 'array' OR jsonb_array_length(p_assignees) < 1 THEN
    RAISE EXCEPTION 'assignees required';
  END IF;

  DELETE FROM core.training_assignees
  WHERE organization_id = p_organization_id
    AND course_id = p_course_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_assignees)
  LOOP
    v_dept := NULLIF(btrim(COALESCE(v_item->>'department_id', '')), '')::uuid;
    v_member := NULLIF(btrim(COALESCE(v_item->>'member_id', '')), '')::uuid;
    v_has_dept := v_dept IS NOT NULL;
    v_has_member := v_member IS NOT NULL;
    IF v_has_dept = v_has_member THEN
      RAISE EXCEPTION 'invalid assignee';
    END IF;

    INSERT INTO core.training_assignees (
      organization_id,
      course_id,
      department_id,
      member_id
    ) VALUES (
      p_organization_id,
      p_course_id,
      v_dept,
      v_member
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION core.replace_training_assignees(uuid, uuid, jsonb)
  TO app_user, app_admin, authenticator;

COMMENT ON FUNCTION core.replace_training_assignees(uuid, uuid, jsonb) IS
  '교육 배정 일괄 교체 (담당자만).';

-- PostgREST: 신규 RPC·정책 반영을 위해 스키마 캐시 리로드를 권장한다.
-- NOTIFY pgrst, 'reload schema';
