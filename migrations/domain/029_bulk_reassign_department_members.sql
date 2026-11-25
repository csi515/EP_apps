-- 다수 멤버 주 소속 부서 원자적 재배치 RPC

CREATE OR REPLACE FUNCTION core.bulk_reassign_department_members(
  p_organization_id uuid,
  p_department_id uuid,
  p_member_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_member_id uuid;
  v_dept_org uuid;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_member_ids IS NULL OR cardinality(p_member_ids) = 0 THEN
    RETURN;
  END IF;

  SELECT organization_id INTO v_dept_org
  FROM core.departments
  WHERE id = p_department_id;

  IF v_dept_org IS NULL OR v_dept_org <> p_organization_id THEN
    RAISE EXCEPTION 'department not found';
  END IF;

  FOREACH v_member_id IN ARRAY p_member_ids
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM core.organization_members m
      WHERE m.id = v_member_id
        AND m.organization_id = p_organization_id
        AND m.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'member not found';
    END IF;

    DELETE FROM core.department_members
    WHERE organization_id = p_organization_id
      AND member_id = v_member_id;

    INSERT INTO core.department_members (
      organization_id,
      department_id,
      member_id,
      scope_type,
      custom_role_id
    ) VALUES (
      p_organization_id,
      p_department_id,
      v_member_id,
      'SELF_ONLY',
      NULL
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION core.bulk_reassign_department_members(uuid, uuid, uuid[])
  TO app_user, app_admin, authenticator;
