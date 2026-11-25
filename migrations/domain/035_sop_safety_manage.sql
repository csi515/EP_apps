-- SOP·위험성평가: can_manage_risk_assessments 에 safety:manage 위임 반영

CREATE OR REPLACE FUNCTION core.can_manage_risk_assessments(p_org uuid)
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
        OR COALESCE((r.permissions->>'safety:manage')::boolean, false)
        OR COALESCE((m.feature_permissions->>'safety:manage')::boolean, false)
      )
  );
$$;

COMMENT ON FUNCTION core.can_manage_risk_assessments(uuid) IS
  '위험성평가 담당(safety:manage) 또는 org admin/owner';

-- PostgREST: NOTIFY pgrst, 'reload schema';
