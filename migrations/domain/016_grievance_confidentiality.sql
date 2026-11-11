-- 노경 건의 기밀: 전용 RLS + 티켓 채번 + PIN 조회 RPC

CREATE OR REPLACE FUNCTION app.can_manage_grievances(p_org uuid)
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
        OR COALESCE((r.permissions->>'grievances_manage')::boolean, false)
        OR COALESCE((r.permissions->>'feedbacks:read_all')::boolean, false)
        OR COALESCE((m.feature_permissions->>'grievances_manage')::boolean, false)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION app.can_manage_grievances(uuid) TO app_user, app_admin;

CREATE TABLE IF NOT EXISTS core.grievance_ticket_counters (
  organization_id uuid PRIMARY KEY REFERENCES core.organizations(id) ON DELETE CASCADE,
  next_val integer NOT NULL DEFAULT 1
);

CREATE OR REPLACE FUNCTION core.next_grievance_ticket_code(p_org uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_n integer;
BEGIN
  IF NOT app.is_org_member(p_org) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO core.grievance_ticket_counters (organization_id, next_val)
  VALUES (p_org, 2)
  ON CONFLICT (organization_id) DO UPDATE
    SET next_val = core.grievance_ticket_counters.next_val + 1
  RETURNING next_val - 1 INTO v_n;
  RETURN 'G-' || lpad(v_n::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION core.next_grievance_ticket_code(uuid) TO app_user, app_admin;

CREATE OR REPLACE FUNCTION core.grievance_pin_hash(p_pin text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest('ep_grievance_v1:' || btrim(COALESCE(p_pin, '')), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION core.inquire_anonymous_grievance(
  p_organization_id uuid,
  p_ticket_code text,
  p_pin text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_row core.anonymous_grievances%ROWTYPE;
  v_ticket text := btrim(COALESCE(p_ticket_code, ''));
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  END IF;
  IF v_ticket = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'TICKET_REQUIRED');
  END IF;

  SELECT * INTO v_row
  FROM core.anonymous_grievances
  WHERE organization_id = p_organization_id
    AND ticket_code = v_ticket
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  END IF;

  IF v_row.visibility = 'named' THEN
    IF v_row.author_user_id IS DISTINCT FROM app.current_user_id()
       AND NOT app.can_manage_grievances(p_organization_id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
    END IF;
  ELSE
    IF v_row.access_pin_hash IS NULL
       OR v_row.access_pin_hash IS DISTINCT FROM core.grievance_pin_hash(COALESCE(p_pin, '')) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'PIN_MISMATCH');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'grievance', jsonb_build_object(
      'id', v_row.id,
      'ticket_code', v_row.ticket_code,
      'visibility', v_row.visibility,
      'category', v_row.category,
      'subject_title', v_row.subject_title,
      'incident_content', v_row.incident_content,
      'status', v_row.status,
      'investigation_feedback', v_row.investigation_feedback,
      'submitted_at', v_row.submitted_at,
      'resolved_at', v_row.resolved_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.inquire_anonymous_grievance(uuid, text, text) TO app_user, app_admin;

ALTER TABLE core.anonymous_grievances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON core.anonymous_grievances;
DROP POLICY IF EXISTS anonymous_grievances_select ON core.anonymous_grievances;
DROP POLICY IF EXISTS anonymous_grievances_insert ON core.anonymous_grievances;
DROP POLICY IF EXISTS anonymous_grievances_update ON core.anonymous_grievances;
DROP POLICY IF EXISTS anonymous_grievances_delete ON core.anonymous_grievances;

CREATE POLICY anonymous_grievances_select ON core.anonymous_grievances
  FOR SELECT TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.can_manage_grievances(organization_id)
      OR (visibility = 'named' AND author_user_id = app.current_user_id())
    )
  );

CREATE POLICY anonymous_grievances_insert ON core.anonymous_grievances
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      (visibility = 'named' AND author_user_id = app.current_user_id())
      OR (visibility = 'anonymous' AND author_user_id IS NULL)
    )
  );

CREATE POLICY anonymous_grievances_update ON core.anonymous_grievances
  FOR UPDATE TO app_user
  USING (app.can_manage_grievances(organization_id))
  WITH CHECK (app.can_manage_grievances(organization_id));

CREATE POLICY anonymous_grievances_delete ON core.anonymous_grievances
  FOR DELETE TO app_user
  USING (app.can_manage_grievances(organization_id));

COMMENT ON FUNCTION core.inquire_anonymous_grievance(uuid, text, text) IS
  '익명 건의: ticket+PIN으로 단건 조회. 목록 RLS는 담당자/본인 기명만 허용.';
