-- MBO: 목표치 자유 텍스트 + 실행 과제 담당자 메모장

-- 1) 목표치 numeric → text
ALTER TABLE core.mbo_objectives
  ALTER COLUMN target_value TYPE text
  USING CASE
    WHEN target_value IS NULL THEN NULL
    ELSE trim(trailing '.' FROM trim(trailing '0' FROM target_value::text))
  END;

ALTER TABLE core.mbo_objective_revisions
  ALTER COLUMN previous_target_value TYPE text
  USING CASE
    WHEN previous_target_value IS NULL THEN NULL
    ELSE trim(trailing '.' FROM trim(trailing '0' FROM previous_target_value::text))
  END;

-- 레거시 테이블이 있으면 경우
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'mbo_goal_revisions'
  ) THEN
    ALTER TABLE core.mbo_goal_revisions
      ALTER COLUMN previous_target_value TYPE text
      USING CASE
        WHEN previous_target_value IS NULL THEN NULL
        ELSE trim(trailing '.' FROM trim(trailing '0' FROM previous_target_value::text))
      END;
  END IF;
END $$;

-- 2) 실행 과제 메모
ALTER TABLE core.mbo_projects
  ADD COLUMN IF NOT EXISTS owner_memo text;

COMMENT ON COLUMN core.mbo_projects.owner_memo IS '담당자 메모장 (본인 수정)';
COMMENT ON COLUMN core.mbo_objectives.target_value IS '목표치 (자유 텍스트)';

-- 3) revise_mbo_goal: text 목표치
DROP FUNCTION IF EXISTS core.revise_mbo_goal(uuid, numeric, date, text, text);

CREATE OR REPLACE FUNCTION core.revise_mbo_goal(
  p_objective_id uuid,
  p_new_target_value text DEFAULT NULL,
  p_new_due_date date DEFAULT NULL,
  p_unmet_reason text DEFAULT NULL,
  p_revision_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_org uuid;
  v_prev_target text;
  v_prev_due date;
  v_prev_title text;
  v_deleted timestamptz;
  v_uid uuid;
BEGIN
  SELECT organization_id, target_value, target_date, title, deleted_at
    INTO v_org, v_prev_target, v_prev_due, v_prev_title, v_deleted
  FROM core.mbo_objectives
  WHERE id = p_objective_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'not found';
  END IF;
  IF v_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'deleted';
  END IF;
  IF NOT app.is_org_member(v_org) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_revision_reason IS NULL OR btrim(p_revision_reason) = '' THEN
    RAISE EXCEPTION 'revision_reason required';
  END IF;

  BEGIN
    v_uid := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
  EXCEPTION WHEN others THEN
    v_uid := NULL;
  END;

  INSERT INTO core.mbo_objective_revisions (
    organization_id,
    objective_id,
    previous_target_value,
    previous_due_date,
    previous_title,
    unmet_reason,
    revision_reason,
    revised_by,
    change_kind
  ) VALUES (
    v_org,
    p_objective_id,
    v_prev_target,
    v_prev_due,
    v_prev_title,
    NULLIF(btrim(COALESCE(p_unmet_reason, '')), ''),
    btrim(p_revision_reason),
    v_uid,
    'revise'
  );

  UPDATE core.mbo_objectives
  SET
    target_value = COALESCE(NULLIF(btrim(p_new_target_value), ''), target_value),
    target_date = COALESCE(p_new_due_date, target_date),
    revision = revision + 1,
    updated_at = now()
  WHERE id = p_objective_id;

  RETURN jsonb_build_object(
    'ok', true,
    'objective_id', p_objective_id,
    'previous_target_value', v_prev_target,
    'previous_due_date', v_prev_due
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.revise_mbo_goal(uuid, text, date, text, text)
  TO app_user, authenticator;

-- soft_delete: previous_target_value 가 text 이므로 변수 타입 맞춤
CREATE OR REPLACE FUNCTION core.soft_delete_mbo_objective(
  p_objective_id uuid,
  p_delete_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_org uuid;
  v_prev_target text;
  v_prev_due date;
  v_prev_title text;
  v_deleted timestamptz;
  v_uid uuid;
BEGIN
  SELECT organization_id, target_value, target_date, title, deleted_at
    INTO v_org, v_prev_target, v_prev_due, v_prev_title, v_deleted
  FROM core.mbo_objectives
  WHERE id = p_objective_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'not found';
  END IF;
  IF NOT app.is_org_member(v_org) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'already deleted';
  END IF;
  IF p_delete_reason IS NULL OR btrim(p_delete_reason) = '' THEN
    RAISE EXCEPTION 'delete_reason required';
  END IF;

  BEGIN
    v_uid := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
  EXCEPTION WHEN others THEN
    v_uid := NULL;
  END;

  INSERT INTO core.mbo_objective_revisions (
    organization_id,
    objective_id,
    previous_target_value,
    previous_due_date,
    previous_title,
    unmet_reason,
    revision_reason,
    revised_by,
    change_kind
  ) VALUES (
    v_org,
    p_objective_id,
    v_prev_target,
    v_prev_due,
    v_prev_title,
    NULL,
    btrim(p_delete_reason),
    v_uid,
    'delete'
  );

  UPDATE core.mbo_objectives
  SET
    deleted_at = now(),
    deleted_by = v_uid,
    delete_reason = btrim(p_delete_reason),
    revision = revision + 1,
    updated_at = now()
  WHERE id = p_objective_id;

  RETURN jsonb_build_object(
    'ok', true,
    'objective_id', p_objective_id,
    'deleted_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.soft_delete_mbo_objective(uuid, text)
  TO app_user, authenticator;
