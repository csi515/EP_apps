-- 조직도 unit_kind·이동 RPC, MBO 하위 리더 헬퍼/평가 RLS

ALTER TABLE core.departments
  ADD COLUMN IF NOT EXISTS unit_kind varchar(32),
  ADD COLUMN IF NOT EXISTS code varchar(32);

CREATE OR REPLACE FUNCTION core.move_department(
  p_department_id uuid,
  p_new_parent_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_org uuid;
  v_old_path text;
  v_new_parent_path text;
  v_new_path text;
  v_id_text text;
BEGIN
  SELECT organization_id, path INTO v_org, v_old_path
  FROM core.departments WHERE id = p_department_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'department not found';
  END IF;
  IF NOT app.is_org_member(v_org) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_new_parent_id IS NOT NULL THEN
    IF p_new_parent_id = p_department_id THEN
      RAISE EXCEPTION 'cannot parent to self';
    END IF;
    SELECT path INTO v_new_parent_path
    FROM core.departments
    WHERE id = p_new_parent_id AND organization_id = v_org;
    IF v_new_parent_path IS NULL THEN
      RAISE EXCEPTION 'parent not found';
    END IF;
    IF v_new_parent_path LIKE v_old_path || '%' THEN
      RAISE EXCEPTION 'cannot move under descendant';
    END IF;
  ELSE
    v_new_parent_path := NULL;
  END IF;

  v_id_text := p_department_id::text;
  IF v_new_parent_path IS NULL THEN
    v_new_path := '/' || v_id_text || '/';
  ELSE
    v_new_path := rtrim(v_new_parent_path, '/') || '/' || v_id_text || '/';
  END IF;

  -- 하위 트리 path/depth 일괄 재작성 (자기 자신 포함)
  UPDATE core.departments d
  SET
    path = v_new_path || substr(d.path, length(v_old_path) + 1),
    depth = cardinality(string_to_array(btrim(v_new_path || substr(d.path, length(v_old_path) + 1), '/'), '/')),
    updated_at = now()
  WHERE d.organization_id = v_org
    AND d.path LIKE v_old_path || '%';

  UPDATE core.departments
  SET parent_id = p_new_parent_id, updated_at = now()
  WHERE id = p_department_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.move_department(uuid, uuid) TO app_user, app_admin, authenticator;

-- 현재 사용자가 대상 user의 조직 하위 리더인지 (DESCENDANTS 스코프 path 접두)
CREATE OR REPLACE FUNCTION app.is_subtree_leader_of_user(p_org uuid, p_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members viewer
    JOIN core.department_members lead_dm
      ON lead_dm.member_id = viewer.id
     AND lead_dm.organization_id = p_org
     AND lead_dm.scope_type = 'DESCENDANTS'
    JOIN core.departments lead_dept
      ON lead_dept.id = lead_dm.department_id
    JOIN core.organization_members target
      ON target.organization_id = p_org
     AND target.user_id = p_target_user_id
     AND target.deleted_at IS NULL
     AND target.is_active = true
    JOIN core.department_members target_dm
      ON target_dm.member_id = target.id
     AND target_dm.organization_id = p_org
    JOIN core.departments target_dept
      ON target_dept.id = target_dm.department_id
    WHERE viewer.organization_id = p_org
      AND viewer.user_id = app.current_user_id()
      AND viewer.deleted_at IS NULL
      AND viewer.is_active = true
      AND target_dept.path LIKE lead_dept.path || '%'
  );
$$;

GRANT EXECUTE ON FUNCTION app.is_subtree_leader_of_user(uuid, uuid) TO app_user, app_admin, authenticator;

DROP POLICY IF EXISTS mbo_evaluations_select ON core.mbo_evaluations;
CREATE POLICY mbo_evaluations_select ON core.mbo_evaluations
  FOR SELECT TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      is_confidential = false
      OR evaluator_id = app.current_user_id()
      OR target_user_id = app.current_user_id()
      OR app.is_org_admin_or_owner(organization_id)
      OR (
        target_user_id IS NOT NULL
        AND app.is_subtree_leader_of_user(organization_id, target_user_id)
      )
    )
  );
