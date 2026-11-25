-- 연구과제: read/write/gate 권한 헬퍼 + RLS (FOR ALL 제거)

CREATE OR REPLACE FUNCTION core.can_read_research(p_org uuid)
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
        OR COALESCE((r.permissions->>'research:read')::boolean, false)
        OR COALESCE((r.permissions->>'research:write')::boolean, false)
        OR COALESCE((r.permissions->>'research:gate:decide')::boolean, false)
        OR COALESCE((r.permissions->>'rnd_portal:access')::boolean, false)
        OR COALESCE((m.feature_permissions->>'research:read')::boolean, false)
        OR COALESCE((m.feature_permissions->>'research:write')::boolean, false)
        OR COALESCE((m.feature_permissions->>'research:gate:decide')::boolean, false)
        OR COALESCE((m.feature_permissions->>'rnd_portal:access')::boolean, false)
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.can_write_research(p_org uuid)
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
        OR COALESCE((r.permissions->>'research:write')::boolean, false)
        OR COALESCE((m.feature_permissions->>'research:write')::boolean, false)
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.can_decide_research_gate(p_org uuid)
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
        OR COALESCE((r.permissions->>'research:gate:decide')::boolean, false)
        OR COALESCE((m.feature_permissions->>'research:gate:decide')::boolean, false)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION core.can_read_research(uuid)
  TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.can_write_research(uuid)
  TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.can_decide_research_gate(uuid)
  TO app_user, app_admin, authenticator;

-- Helper: apply SELECT/WRITE policies to a research_* table
-- research_projects
DROP POLICY IF EXISTS tenant_isolation ON core.research_projects;
DROP POLICY IF EXISTS research_projects_select ON core.research_projects;
DROP POLICY IF EXISTS research_projects_insert ON core.research_projects;
DROP POLICY IF EXISTS research_projects_update ON core.research_projects;
DROP POLICY IF EXISTS research_projects_delete ON core.research_projects;

CREATE POLICY research_projects_select ON core.research_projects
  FOR SELECT TO app_user
  USING (core.can_read_research(organization_id));

CREATE POLICY research_projects_insert ON core.research_projects
  FOR INSERT TO app_user
  WITH CHECK (core.can_write_research(organization_id));

CREATE POLICY research_projects_update ON core.research_projects
  FOR UPDATE TO app_user
  USING (core.can_write_research(organization_id))
  WITH CHECK (core.can_write_research(organization_id));

CREATE POLICY research_projects_delete ON core.research_projects
  FOR DELETE TO app_user
  USING (core.can_write_research(organization_id));

-- research_project_members
DROP POLICY IF EXISTS tenant_isolation ON core.research_project_members;
DROP POLICY IF EXISTS research_project_members_select ON core.research_project_members;
DROP POLICY IF EXISTS research_project_members_insert ON core.research_project_members;
DROP POLICY IF EXISTS research_project_members_update ON core.research_project_members;
DROP POLICY IF EXISTS research_project_members_delete ON core.research_project_members;

CREATE POLICY research_project_members_select ON core.research_project_members
  FOR SELECT TO app_user
  USING (core.can_read_research(organization_id));

CREATE POLICY research_project_members_insert ON core.research_project_members
  FOR INSERT TO app_user
  WITH CHECK (core.can_write_research(organization_id));

CREATE POLICY research_project_members_update ON core.research_project_members
  FOR UPDATE TO app_user
  USING (core.can_write_research(organization_id))
  WITH CHECK (core.can_write_research(organization_id));

CREATE POLICY research_project_members_delete ON core.research_project_members
  FOR DELETE TO app_user
  USING (core.can_write_research(organization_id));

-- research_project_deliverables
DROP POLICY IF EXISTS tenant_isolation ON core.research_project_deliverables;
DROP POLICY IF EXISTS research_project_deliverables_select ON core.research_project_deliverables;
DROP POLICY IF EXISTS research_project_deliverables_insert ON core.research_project_deliverables;
DROP POLICY IF EXISTS research_project_deliverables_update ON core.research_project_deliverables;
DROP POLICY IF EXISTS research_project_deliverables_delete ON core.research_project_deliverables;

CREATE POLICY research_project_deliverables_select ON core.research_project_deliverables
  FOR SELECT TO app_user
  USING (core.can_read_research(organization_id));

CREATE POLICY research_project_deliverables_insert ON core.research_project_deliverables
  FOR INSERT TO app_user
  WITH CHECK (core.can_write_research(organization_id));

CREATE POLICY research_project_deliverables_update ON core.research_project_deliverables
  FOR UPDATE TO app_user
  USING (core.can_write_research(organization_id))
  WITH CHECK (core.can_write_research(organization_id));

CREATE POLICY research_project_deliverables_delete ON core.research_project_deliverables
  FOR DELETE TO app_user
  USING (core.can_write_research(organization_id));

-- research_project_gates
DROP POLICY IF EXISTS tenant_isolation ON core.research_project_gates;
DROP POLICY IF EXISTS research_project_gates_select ON core.research_project_gates;
DROP POLICY IF EXISTS research_project_gates_insert ON core.research_project_gates;
DROP POLICY IF EXISTS research_project_gates_update ON core.research_project_gates;
DROP POLICY IF EXISTS research_project_gates_delete ON core.research_project_gates;

CREATE POLICY research_project_gates_select ON core.research_project_gates
  FOR SELECT TO app_user
  USING (core.can_read_research(organization_id));

CREATE POLICY research_project_gates_insert ON core.research_project_gates
  FOR INSERT TO app_user
  WITH CHECK (core.can_write_research(organization_id));

CREATE POLICY research_project_gates_update ON core.research_project_gates
  FOR UPDATE TO app_user
  USING (
    core.can_write_research(organization_id)
    OR core.can_decide_research_gate(organization_id)
  )
  WITH CHECK (
    core.can_write_research(organization_id)
    OR core.can_decide_research_gate(organization_id)
  );

CREATE POLICY research_project_gates_delete ON core.research_project_gates
  FOR DELETE TO app_user
  USING (core.can_write_research(organization_id));

-- research_project_links
DROP POLICY IF EXISTS tenant_isolation ON core.research_project_links;
DROP POLICY IF EXISTS research_project_links_select ON core.research_project_links;
DROP POLICY IF EXISTS research_project_links_insert ON core.research_project_links;
DROP POLICY IF EXISTS research_project_links_update ON core.research_project_links;
DROP POLICY IF EXISTS research_project_links_delete ON core.research_project_links;

CREATE POLICY research_project_links_select ON core.research_project_links
  FOR SELECT TO app_user
  USING (core.can_read_research(organization_id));

CREATE POLICY research_project_links_insert ON core.research_project_links
  FOR INSERT TO app_user
  WITH CHECK (core.can_write_research(organization_id));

CREATE POLICY research_project_links_update ON core.research_project_links
  FOR UPDATE TO app_user
  USING (core.can_write_research(organization_id))
  WITH CHECK (core.can_write_research(organization_id));

CREATE POLICY research_project_links_delete ON core.research_project_links
  FOR DELETE TO app_user
  USING (core.can_write_research(organization_id));

-- PostgREST: NOTIFY pgrst, 'reload schema';
