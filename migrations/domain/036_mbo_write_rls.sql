-- MBO: goals:write 기반 쓰기 RLS (objectives UPDATE/INSERT, month_cells)

CREATE OR REPLACE FUNCTION core.can_write_mbo_goals(p_org uuid)
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
        OR COALESCE((r.permissions->>'mbo:goals:write')::boolean, false)
        OR COALESCE((m.feature_permissions->>'mbo:goals:write')::boolean, false)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION core.can_write_mbo_goals(uuid)
  TO app_user, app_admin, authenticator;

COMMENT ON FUNCTION core.can_write_mbo_goals(uuid) IS
  'MBO 목표 작성(mbo:goals:write) 또는 org admin/owner';

DROP POLICY IF EXISTS mbo_objectives_insert ON core.mbo_objectives;
DROP POLICY IF EXISTS mbo_objectives_update ON core.mbo_objectives;

CREATE POLICY mbo_objectives_insert ON core.mbo_objectives
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      owner_id = app.current_user_id()
      OR owner_id IS NULL
      OR core.can_write_mbo_goals(organization_id)
    )
  );

CREATE POLICY mbo_objectives_update ON core.mbo_objectives
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      owner_id = app.current_user_id()
      OR core.can_write_mbo_goals(organization_id)
      OR app.is_org_admin_or_owner(organization_id)
    )
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      owner_id = app.current_user_id()
      OR core.can_write_mbo_goals(organization_id)
      OR app.is_org_admin_or_owner(organization_id)
    )
  );

DROP POLICY IF EXISTS mbo_project_month_cells_all ON core.mbo_project_month_cells;
DROP POLICY IF EXISTS mbo_project_month_cells_select ON core.mbo_project_month_cells;
DROP POLICY IF EXISTS mbo_project_month_cells_insert ON core.mbo_project_month_cells;
DROP POLICY IF EXISTS mbo_project_month_cells_update ON core.mbo_project_month_cells;
DROP POLICY IF EXISTS mbo_project_month_cells_delete ON core.mbo_project_month_cells;

CREATE POLICY mbo_project_month_cells_select ON core.mbo_project_month_cells
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY mbo_project_month_cells_insert ON core.mbo_project_month_cells
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_write_mbo_goals(organization_id)
  );

CREATE POLICY mbo_project_month_cells_update ON core.mbo_project_month_cells
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_write_mbo_goals(organization_id)
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_write_mbo_goals(organization_id)
  );

CREATE POLICY mbo_project_month_cells_delete ON core.mbo_project_month_cells
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_write_mbo_goals(organization_id)
  );

-- PostgREST: NOTIFY pgrst, 'reload schema';
