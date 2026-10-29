-- MBO 하드닝: 기밀 평가 RLS, org admin 헬퍼

CREATE OR REPLACE FUNCTION app.is_org_admin_or_owner(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    WHERE m.organization_id = p_org
      AND m.user_id = app.current_user_id()
      AND m.role IN ('owner', 'admin')
      AND m.is_active = true
      AND m.deleted_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION app.is_org_admin_or_owner(uuid) TO app_user, app_admin, authenticator;

ALTER TABLE core.mbo_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON core.mbo_evaluations;
DROP POLICY IF EXISTS mbo_evaluations_select ON core.mbo_evaluations;
DROP POLICY IF EXISTS mbo_evaluations_write ON core.mbo_evaluations;
DROP POLICY IF EXISTS mbo_evaluations_insert ON core.mbo_evaluations;
DROP POLICY IF EXISTS mbo_evaluations_update ON core.mbo_evaluations;
DROP POLICY IF EXISTS mbo_evaluations_delete ON core.mbo_evaluations;

-- 기밀 평가는 평가자·대상·owner/admin만 조회 (FOR ALL 쓰지 않음 — SELECT OR 회피)
CREATE POLICY mbo_evaluations_select ON core.mbo_evaluations
  FOR SELECT TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      is_confidential = false
      OR evaluator_id = app.current_user_id()
      OR target_user_id = app.current_user_id()
      OR app.is_org_admin_or_owner(organization_id)
    )
  );

CREATE POLICY mbo_evaluations_insert ON core.mbo_evaluations
  FOR INSERT TO app_user
  WITH CHECK (app.is_org_member(organization_id));

CREATE POLICY mbo_evaluations_update ON core.mbo_evaluations
  FOR UPDATE TO app_user
  USING (app.is_org_member(organization_id))
  WITH CHECK (app.is_org_member(organization_id));

CREATE POLICY mbo_evaluations_delete ON core.mbo_evaluations
  FOR DELETE TO app_user
  USING (app.is_org_member(organization_id));
