-- MBO 공개범위·soft-delete·공유·삭제 이력 (mbo_objectives 제품 경로)

ALTER TABLE core.mbo_objectives
  ADD COLUMN IF NOT EXISTS visibility_type text NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS delete_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mbo_objectives_visibility_type_chk'
  ) THEN
    ALTER TABLE core.mbo_objectives
      ADD CONSTRAINT mbo_objectives_visibility_type_chk
      CHECK (visibility_type IN ('PUBLIC', 'PRIVATE', 'PARTIAL'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mbo_objectives_visibility
  ON core.mbo_objectives (organization_id, visibility_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mbo_objectives_deleted
  ON core.mbo_objectives (organization_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS core.mbo_objective_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES core.mbo_objectives(id) ON DELETE CASCADE,
  shared_with_member_id uuid NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mbo_objective_shares_unique UNIQUE (objective_id, shared_with_member_id)
);

CREATE INDEX IF NOT EXISTS idx_mbo_objective_shares_member
  ON core.mbo_objective_shares (shared_with_member_id);

CREATE INDEX IF NOT EXISTS idx_mbo_objective_shares_objective
  ON core.mbo_objective_shares (objective_id);

ALTER TABLE core.mbo_objective_revisions
  ADD COLUMN IF NOT EXISTS change_kind text NOT NULL DEFAULT 'revise';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mbo_objective_revisions_change_kind_chk'
  ) THEN
    ALTER TABLE core.mbo_objective_revisions
      ADD CONSTRAINT mbo_objective_revisions_change_kind_chk
      CHECK (change_kind IN ('revise', 'delete', 'field'));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON core.mbo_objective_shares TO app_user, authenticator;
GRANT SELECT, INSERT ON core.mbo_objective_revisions TO app_user, authenticator;

-- soft-delete: 이력 남기고 deleted_at 세팅
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
  v_prev_target numeric;
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

-- revise_mbo_goal: change_kind=revise 명시
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

-- RLS: 공개범위 기반 SELECT (tenant_isolation FOR ALL 교체)
ALTER TABLE core.mbo_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.mbo_objective_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.mbo_objective_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON core.mbo_objectives;
DROP POLICY IF EXISTS mbo_objectives_select ON core.mbo_objectives;
DROP POLICY IF EXISTS mbo_objectives_insert ON core.mbo_objectives;
DROP POLICY IF EXISTS mbo_objectives_update ON core.mbo_objectives;
DROP POLICY IF EXISTS mbo_objectives_delete ON core.mbo_objectives;

CREATE POLICY mbo_objectives_select ON core.mbo_objectives
  FOR SELECT TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      -- 삭제분: 작성자·admin만 (이력)
      (
        deleted_at IS NOT NULL
        AND (
          owner_id = app.current_user_id()
          OR app.is_org_admin_or_owner(organization_id)
        )
      )
      OR (
        deleted_at IS NULL
        AND (
          owner_id = app.current_user_id()
          OR app.is_org_admin_or_owner(organization_id)
          OR (
            owner_id IS NOT NULL
            AND app.is_subtree_leader_of_user(organization_id, owner_id)
          )
          OR visibility_type = 'PUBLIC'
          OR (
            visibility_type = 'PARTIAL'
            AND EXISTS (
              SELECT 1
              FROM core.mbo_objective_shares s
              JOIN core.organization_members m
                ON m.id = s.shared_with_member_id
               AND m.organization_id = mbo_objectives.organization_id
               AND m.user_id = app.current_user_id()
               AND m.deleted_at IS NULL
               AND m.is_active = true
              WHERE s.objective_id = mbo_objectives.id
            )
          )
        )
      )
    )
  );

CREATE POLICY mbo_objectives_insert ON core.mbo_objectives
  FOR INSERT TO app_user
  WITH CHECK (app.is_org_member(organization_id));

CREATE POLICY mbo_objectives_update ON core.mbo_objectives
  FOR UPDATE TO app_user
  USING (app.is_org_member(organization_id))
  WITH CHECK (app.is_org_member(organization_id));

-- hard delete 차단: 정책 없음(soft-delete RPC만). 멤버 DELETE 거부.
CREATE POLICY mbo_objectives_delete ON core.mbo_objectives
  FOR DELETE TO app_user
  USING (false);

DROP POLICY IF EXISTS tenant_isolation ON core.mbo_objective_shares;
DROP POLICY IF EXISTS mbo_objective_shares_all ON core.mbo_objective_shares;
CREATE POLICY mbo_objective_shares_all ON core.mbo_objective_shares
  FOR ALL TO app_user
  USING (app.is_org_member(organization_id))
  WITH CHECK (app.is_org_member(organization_id));

DROP POLICY IF EXISTS tenant_isolation ON core.mbo_objective_revisions;
DROP POLICY IF EXISTS mbo_objective_revisions_select ON core.mbo_objective_revisions;
DROP POLICY IF EXISTS mbo_objective_revisions_insert ON core.mbo_objective_revisions;
CREATE POLICY mbo_objective_revisions_select ON core.mbo_objective_revisions
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));
CREATE POLICY mbo_objective_revisions_insert ON core.mbo_objective_revisions
  FOR INSERT TO app_user
  WITH CHECK (app.is_org_member(organization_id));
