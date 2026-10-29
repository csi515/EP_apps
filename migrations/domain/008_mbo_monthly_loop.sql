-- MBO 월별 체크 루프: period_ym, objective 개정 이력, revise RPC 정합

ALTER TABLE core.mbo_objectives
  ADD COLUMN IF NOT EXISTS target_value numeric;

ALTER TABLE core.mbo_progress_logs
  ADD COLUMN IF NOT EXISTS period_ym text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mbo_progress_logs_period_ym_format'
  ) THEN
    ALTER TABLE core.mbo_progress_logs
      ADD CONSTRAINT mbo_progress_logs_period_ym_format
      CHECK (period_ym IS NULL OR period_ym ~ '^\d{4}-(0[1-9]|1[0-2])$');
  END IF;
END $$;

UPDATE core.mbo_progress_logs
SET period_ym = to_char(COALESCE(log_date, CURRENT_DATE), 'YYYY-MM')
WHERE period_ym IS NULL;

-- 동일 (org, project, period) 중복 제거 후 NOT NULL + UNIQUE
DELETE FROM core.mbo_progress_logs a
USING core.mbo_progress_logs b
WHERE a.ctid < b.ctid
  AND a.organization_id = b.organization_id
  AND a.project_id = b.project_id
  AND a.period_ym = b.period_ym;

ALTER TABLE core.mbo_progress_logs
  ALTER COLUMN period_ym SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mbo_progress_logs_org_project_period_uq'
  ) THEN
    ALTER TABLE core.mbo_progress_logs
      ADD CONSTRAINT mbo_progress_logs_org_project_period_uq
      UNIQUE (organization_id, project_id, period_ym);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS core.mbo_objective_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES core.mbo_objectives(id) ON DELETE CASCADE,
  previous_target_value numeric,
  previous_due_date date,
  previous_title text,
  unmet_reason text,
  revision_reason text NOT NULL,
  revised_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mbo_objective_revisions_obj
  ON core.mbo_objective_revisions (objective_id, created_at DESC);

GRANT SELECT, INSERT ON core.mbo_objective_revisions TO app_user, authenticator;
GRANT SELECT, UPDATE ON core.mbo_objectives TO app_user, authenticator;
GRANT SELECT, INSERT, UPDATE ON core.mbo_progress_logs TO app_user, authenticator;

-- 기존 title-only 시그니처 제거 후 클라이언트 계약에 맞게 재정의
DROP FUNCTION IF EXISTS core.revise_mbo_goal(uuid, text);

CREATE OR REPLACE FUNCTION core.revise_mbo_goal(
  p_objective_id uuid,
  p_new_target_value numeric DEFAULT NULL,
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
  v_prev_target numeric;
  v_prev_due date;
  v_prev_title text;
  v_uid uuid;
BEGIN
  SELECT organization_id, target_value, target_date, title
    INTO v_org, v_prev_target, v_prev_due, v_prev_title
  FROM core.mbo_objectives
  WHERE id = p_objective_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'not found';
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
    revised_by
  ) VALUES (
    v_org,
    p_objective_id,
    v_prev_target,
    v_prev_due,
    v_prev_title,
    NULLIF(btrim(COALESCE(p_unmet_reason, '')), ''),
    btrim(p_revision_reason),
    v_uid
  );

  UPDATE core.mbo_objectives
  SET
    target_value = COALESCE(p_new_target_value, target_value),
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

GRANT EXECUTE ON FUNCTION core.revise_mbo_goal(uuid, numeric, date, text, text)
  TO app_user, authenticator;
