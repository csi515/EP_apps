-- 테넌트 격리. 세션 사용자는 app.current_user_id() 로 판별한다.
-- 앱은 트랜잭션 안에서 SELECT set_config('app.user_id', '<uuid>', true); 후 조회한다.

ALTER TABLE core.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organizations_member_read ON core.organizations;
CREATE POLICY organizations_member_read ON core.organizations
  FOR SELECT TO app_user
  USING (app.is_org_member(id));

DROP POLICY IF EXISTS organizations_owner_update ON core.organizations;
CREATE POLICY organizations_owner_update ON core.organizations
  FOR UPDATE TO app_user
  USING (
    EXISTS (
      SELECT 1 FROM core.organization_members m
      WHERE m.organization_id = organizations.id
        AND m.user_id = app.current_user_id()
        AND m.role = 'owner'
        AND m.is_active = true
        AND m.deleted_at IS NULL
    )
  )
  WITH CHECK (app.is_org_member(id));

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'core'
      AND c.column_name = 'organization_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> 'organizations'
  LOOP
    EXECUTE format('ALTER TABLE core.%I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON core.%I', r.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON core.%I FOR ALL TO app_user USING (app.is_org_member(organization_id)) WITH CHECK (app.is_org_member(organization_id))',
      r.table_name
    );
  END LOOP;

  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'core'
      AND c.column_name = 'tenant_id'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns o
        WHERE o.table_schema = 'core'
          AND o.table_name = c.table_name
          AND o.column_name = 'organization_id'
      )
  LOOP
    EXECUTE format('ALTER TABLE core.%I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON core.%I', r.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON core.%I FOR ALL TO app_user USING (app.is_org_member(tenant_id)) WITH CHECK (app.is_org_member(tenant_id))',
      r.table_name
    );
  END LOOP;
END $$;

ALTER TABLE core.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON core.product_variants;
CREATE POLICY tenant_isolation ON core.product_variants
  FOR ALL TO app_user
  USING (
    EXISTS (
      SELECT 1 FROM core.products p
      WHERE p.id = product_variants.product_id
        AND app.is_org_member(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core.products p
      WHERE p.id = product_variants.product_id
        AND app.is_org_member(p.organization_id)
    )
  );

ALTER TABLE core.shuttle_stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON core.shuttle_stops;
CREATE POLICY tenant_isolation ON core.shuttle_stops
  FOR ALL TO app_user
  USING (
    EXISTS (
      SELECT 1 FROM core.shuttle_routes r
      WHERE r.id = shuttle_stops.route_id
        AND app.is_org_member(r.tenant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core.shuttle_routes r
      WHERE r.id = shuttle_stops.route_id
        AND app.is_org_member(r.tenant_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO app_user;
GRANT ALL ON ALL TABLES IN SCHEMA core TO app_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO app_user, app_admin;
