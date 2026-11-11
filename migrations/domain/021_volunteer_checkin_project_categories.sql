-- 봉사활동 체크인 + MBO 기본 프로젝트 분류 시드

CREATE OR REPLACE FUNCTION core.can_manage_volunteer(p_org uuid)
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
        OR COALESCE((r.permissions->>'volunteer:manage')::boolean, false)
        OR COALESCE((m.feature_permissions->>'volunteer:manage')::boolean, false)
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.set_volunteer_signup_checkin(
  p_organization_id uuid,
  p_activity_id uuid,
  p_member_id uuid,
  p_checked_in boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_act core.volunteer_activities%ROWTYPE;
  v_row core.volunteer_signups%ROWTYPE;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT core.can_manage_volunteer(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_act
  FROM core.volunteer_activities
  WHERE id = p_activity_id
    AND organization_id = p_organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'activity not found';
  END IF;

  UPDATE core.volunteer_signups
  SET checked_in_at = CASE
        WHEN COALESCE(p_checked_in, false) THEN COALESCE(checked_in_at, now())
        ELSE NULL
      END
  WHERE organization_id = p_organization_id
    AND activity_id = p_activity_id
    AND member_id = p_member_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'signup not found';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION core.ensure_default_project_categories(p_org uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_uid uuid := app.current_user_id();
  v_inserted integer := 0;
BEGIN
  IF NOT app.is_org_member(p_org) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH seeds(category_key, label, color, sort_order) AS (
    VALUES
      ('research', '연구', '#4f46e5', 10),
      ('quality', '품질', '#059669', 20),
      ('technology', '기술', '#0284c7', 30),
      ('patent', '특허', '#c026d3', 40),
      ('safety', '안전', '#dc2626', 50)
  ),
  ins AS (
    INSERT INTO core.project_categories (
      organization_id, category_key, label, color, sort_order, is_active, created_by
    )
    SELECT p_org, s.category_key, s.label, s.color, s.sort_order, true, v_uid
    FROM seeds s
    ON CONFLICT (organization_id, category_key) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_inserted FROM ins;

  RETURN jsonb_build_object('ok', true, 'inserted', v_inserted);
END;
$$;

GRANT EXECUTE ON FUNCTION core.can_manage_volunteer(uuid) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.set_volunteer_signup_checkin(uuid, uuid, uuid, boolean) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.ensure_default_project_categories(uuid) TO app_user, authenticator;
