-- 작업표준·위험성평가: 자식 RLS + WORM + 결재/개정/재서약 RPC

-- 네이티브 PG에서 테이블 소유가 postgres인 경우, ep 앱 역할로 이관해 이후 정책 변경이 가능하도록 한다.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolsuper)
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ep') THEN
    ALTER TABLE core.document_approval_lines OWNER TO ep;
    ALTER TABLE core.risk_assessment_revisions OWNER TO ep;
    ALTER TABLE core.risk_assessment_worker_repledges OWNER TO ep;
    ALTER TABLE core.risk_assessments OWNER TO ep;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- document_approval_lines
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.document_approval_lines;
DROP POLICY IF EXISTS document_approval_lines_select ON core.document_approval_lines;
DROP POLICY IF EXISTS document_approval_lines_insert ON core.document_approval_lines;
DROP POLICY IF EXISTS document_approval_lines_update ON core.document_approval_lines;
DROP POLICY IF EXISTS document_approval_lines_delete ON core.document_approval_lines;

CREATE POLICY document_approval_lines_select ON core.document_approval_lines
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));
-- INSERT/UPDATE/DELETE 정책 없음 → 클라이언트 직접 쓰기 거부, RPC(SECURITY DEFINER)만 가능

-- ---------------------------------------------------------------------------
-- risk_assessment_revisions (WORM: UPDATE/DELETE 차단)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.risk_assessment_revisions;
DROP POLICY IF EXISTS risk_assessment_revisions_select ON core.risk_assessment_revisions;
DROP POLICY IF EXISTS risk_assessment_revisions_insert ON core.risk_assessment_revisions;
DROP POLICY IF EXISTS risk_assessment_revisions_update ON core.risk_assessment_revisions;
DROP POLICY IF EXISTS risk_assessment_revisions_delete ON core.risk_assessment_revisions;

CREATE POLICY risk_assessment_revisions_select ON core.risk_assessment_revisions
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));
-- 쓰기는 RPC만. WORM 트리거가 UPDATE/DELETE를 추가로 차단.

CREATE OR REPLACE FUNCTION core.prevent_risk_assessment_revision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'risk_assessment_revisions are WORM (UPDATE/DELETE blocked)';
END;
$$;

DROP TRIGGER IF EXISTS trg_risk_assessment_revisions_worm_upd ON core.risk_assessment_revisions;
CREATE TRIGGER trg_risk_assessment_revisions_worm_upd
  BEFORE UPDATE ON core.risk_assessment_revisions
  FOR EACH ROW
  EXECUTE FUNCTION core.prevent_risk_assessment_revision_mutation();

DROP TRIGGER IF EXISTS trg_risk_assessment_revisions_worm_del ON core.risk_assessment_revisions;
CREATE TRIGGER trg_risk_assessment_revisions_worm_del
  BEFORE DELETE ON core.risk_assessment_revisions
  FOR EACH ROW
  EXECUTE FUNCTION core.prevent_risk_assessment_revision_mutation();

-- ---------------------------------------------------------------------------
-- risk_assessment_worker_repledges
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.risk_assessment_worker_repledges;
DROP POLICY IF EXISTS risk_repledges_select ON core.risk_assessment_worker_repledges;
DROP POLICY IF EXISTS risk_repledges_insert ON core.risk_assessment_worker_repledges;
DROP POLICY IF EXISTS risk_repledges_update ON core.risk_assessment_worker_repledges;
DROP POLICY IF EXISTS risk_repledges_delete ON core.risk_assessment_worker_repledges;

CREATE POLICY risk_repledges_select ON core.risk_assessment_worker_repledges
  FOR SELECT TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      worker_user_id = app.current_user_id()
      OR core.can_manage_risk_assessments(organization_id)
    )
  );
-- INSERT/UPDATE/DELETE 정책 없음 → RPC만 쓰기

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.risk_assessment_user_display_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT COALESCE(NULLIF(btrim(u.full_name), ''), NULLIF(btrim(u.email), ''), p_user_id::text)
  FROM app.users u
  WHERE u.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION core.seed_risk_assessment_repledges(
  p_assessment core.risk_assessments
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
BEGIN
  IF p_assessment.department_id IS NOT NULL THEN
    INSERT INTO core.risk_assessment_worker_repledges (
      organization_id,
      assessment_id,
      department_id,
      required_version,
      worker_user_id
    )
    SELECT
      p_assessment.organization_id,
      p_assessment.id,
      p_assessment.department_id,
      p_assessment.current_version,
      m.user_id
    FROM core.department_members dm
    JOIN core.organization_members m
      ON m.id = dm.member_id
     AND m.organization_id = dm.organization_id
    WHERE dm.organization_id = p_assessment.organization_id
      AND dm.department_id = p_assessment.department_id
      AND m.is_active = true
      AND m.deleted_at IS NULL
    ON CONFLICT (assessment_id, worker_user_id, required_version) DO NOTHING;
  ELSE
    INSERT INTO core.risk_assessment_worker_repledges (
      organization_id,
      assessment_id,
      department_id,
      required_version,
      worker_user_id
    )
    SELECT
      p_assessment.organization_id,
      p_assessment.id,
      NULL,
      p_assessment.current_version,
      m.user_id
    FROM core.organization_members m
    WHERE m.organization_id = p_assessment.organization_id
      AND m.is_active = true
      AND m.deleted_at IS NULL
    ON CONFLICT (assessment_id, worker_user_id, required_version) DO NOTHING;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: submit_risk_assessment_for_review
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.submit_risk_assessment_for_review(
  p_assessment_id uuid,
  p_reviewer_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_doc core.risk_assessments%ROWTYPE;
  v_uid uuid := app.current_user_id();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_reviewer_id IS NULL THEN
    RAISE EXCEPTION 'reviewer required';
  END IF;

  SELECT * INTO v_doc
  FROM core.risk_assessments
  WHERE id = p_assessment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;
  IF NOT app.is_org_member(v_doc.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_doc.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'not draft';
  END IF;
  IF v_doc.created_by <> v_uid AND NOT core.can_manage_risk_assessments(v_doc.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM core.organization_members m
    WHERE m.organization_id = v_doc.organization_id
      AND m.user_id = p_reviewer_id
      AND m.is_active = true
      AND m.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'reviewer not in organization';
  END IF;

  DELETE FROM core.document_approval_lines WHERE assessment_id = v_doc.id;

  INSERT INTO core.document_approval_lines (
    assessment_id, organization_id, step_order, step_type,
    assignee_id, assignee_name, action_status, action_at
  ) VALUES (
    v_doc.id, v_doc.organization_id, 1, 'DRAFT',
    v_doc.created_by, core.risk_assessment_user_display_name(v_doc.created_by),
    'APPROVED', now()
  );

  INSERT INTO core.document_approval_lines (
    assessment_id, organization_id, step_order, step_type,
    assignee_id, assignee_name, action_status
  ) VALUES (
    v_doc.id, v_doc.organization_id, 2, 'REVIEW',
    p_reviewer_id, core.risk_assessment_user_display_name(p_reviewer_id),
    'WAIT'
  );

  UPDATE core.risk_assessments
  SET
    status = 'REVIEW_PENDING',
    snapshot_payload = jsonb_set(
      COALESCE(snapshot_payload, '{}'::jsonb),
      '{intendedReviewerId}',
      to_jsonb(p_reviewer_id::text),
      true
    ),
    updated_at = now()
  WHERE id = v_doc.id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.submit_risk_assessment_for_review(uuid, uuid)
  TO app_user, app_admin, authenticator;

-- ---------------------------------------------------------------------------
-- RPC: approve_risk_assessment_step
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.approve_risk_assessment_step(
  p_assessment_id uuid,
  p_step_order int,
  p_comment text DEFAULT NULL,
  p_signature text DEFAULT NULL,
  p_next_assignee_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_doc core.risk_assessments%ROWTYPE;
  v_line core.document_approval_lines%ROWTYPE;
  v_uid uuid := app.current_user_id();
  v_sig text := NULLIF(btrim(COALESCE(p_signature, '')), '');
  v_rev_type text;
  v_rev_reason text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_step_order NOT IN (2, 3) THEN
    RAISE EXCEPTION 'invalid step';
  END IF;
  IF v_sig IS NULL THEN
    RAISE EXCEPTION 'signature required';
  END IF;

  SELECT * INTO v_doc
  FROM core.risk_assessments
  WHERE id = p_assessment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;
  IF NOT app.is_org_member(v_doc.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_line
  FROM core.document_approval_lines
  WHERE assessment_id = v_doc.id
    AND step_order = p_step_order
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'line not found';
  END IF;
  IF v_line.action_status <> 'WAIT' THEN
    RAISE EXCEPTION 'line not waiting';
  END IF;
  IF v_line.assignee_id <> v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_step_order = 2 THEN
    IF v_doc.status <> 'REVIEW_PENDING' THEN
      RAISE EXCEPTION 'invalid status';
    END IF;
    IF p_next_assignee_id IS NULL THEN
      RAISE EXCEPTION 'approver required';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM core.organization_members m
      WHERE m.organization_id = v_doc.organization_id
        AND m.user_id = p_next_assignee_id
        AND m.is_active = true
        AND m.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'approver not in organization';
    END IF;

    UPDATE core.document_approval_lines
    SET
      action_status = 'APPROVED',
      comment = NULLIF(btrim(COALESCE(p_comment, '')), ''),
      signature_data = v_sig,
      action_at = now()
    WHERE id = v_line.id;

    DELETE FROM core.document_approval_lines
    WHERE assessment_id = v_doc.id AND step_order = 3;

    INSERT INTO core.document_approval_lines (
      assessment_id, organization_id, step_order, step_type,
      assignee_id, assignee_name, action_status
    ) VALUES (
      v_doc.id, v_doc.organization_id, 3, 'APPROVE',
      p_next_assignee_id, core.risk_assessment_user_display_name(p_next_assignee_id),
      'WAIT'
    );

    UPDATE core.risk_assessments
    SET
      status = 'APPROVAL_PENDING',
      snapshot_payload = jsonb_set(
        COALESCE(snapshot_payload, '{}'::jsonb),
        '{intendedApproverId}',
        to_jsonb(p_next_assignee_id::text),
        true
      ),
      updated_at = now()
    WHERE id = v_doc.id;
    RETURN;
  END IF;

  -- step 3 final approve
  IF v_doc.status <> 'APPROVAL_PENDING' THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE core.document_approval_lines
  SET
    action_status = 'APPROVED',
    comment = NULLIF(btrim(COALESCE(p_comment, '')), ''),
    signature_data = v_sig,
    action_at = now()
  WHERE id = v_line.id;

  v_rev_type := COALESCE(
    NULLIF(btrim(v_doc.snapshot_payload->>'_pendingRevisionType'), ''),
    CASE WHEN v_doc.current_version <= 1 THEN 'INITIAL' ELSE 'PERIODIC' END
  );
  IF v_rev_type NOT IN ('INITIAL', 'PERIODIC', 'OCCASIONAL') THEN
    v_rev_type := 'PERIODIC';
  END IF;
  v_rev_reason := COALESCE(
    NULLIF(btrim(v_doc.snapshot_payload->>'_pendingRevisionReason'), ''),
    CASE WHEN v_rev_type = 'INITIAL' THEN '최초 승인' ELSE '승인 완료' END
  );

  INSERT INTO core.risk_assessment_revisions (
    assessment_id,
    organization_id,
    version,
    revision_type,
    revision_reason,
    snapshot_payload,
    approved_by,
    approved_at
  ) VALUES (
    v_doc.id,
    v_doc.organization_id,
    v_doc.current_version,
    v_rev_type,
    v_rev_reason,
    jsonb_build_object(
      'id', v_doc.id,
      'document_no', v_doc.document_no,
      'title', v_doc.title,
      'process_name', v_doc.process_name,
      'department_id', v_doc.department_id,
      'current_version', v_doc.current_version,
      'status', 'APPROVED',
      'payload', COALESCE(v_doc.snapshot_payload, '{}'::jsonb)
    ),
    v_uid,
    now()
  )
  ON CONFLICT (assessment_id, version) DO NOTHING;

  UPDATE core.risk_assessments
  SET
    status = 'APPROVED',
    snapshot_payload = (COALESCE(snapshot_payload, '{}'::jsonb)
      - '_pendingRevisionType'
      - '_pendingRevisionReason'),
    updated_at = now()
  WHERE id = v_doc.id;

  SELECT * INTO v_doc FROM core.risk_assessments WHERE id = p_assessment_id;
  PERFORM core.seed_risk_assessment_repledges(v_doc);
END;
$$;

GRANT EXECUTE ON FUNCTION core.approve_risk_assessment_step(uuid, int, text, text, uuid)
  TO app_user, app_admin, authenticator;

-- ---------------------------------------------------------------------------
-- RPC: reject_risk_assessment_step
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.reject_risk_assessment_step(
  p_assessment_id uuid,
  p_step_order int,
  p_reject_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_doc core.risk_assessments%ROWTYPE;
  v_line core.document_approval_lines%ROWTYPE;
  v_uid uuid := app.current_user_id();
  v_reason text := NULLIF(btrim(COALESCE(p_reject_reason, '')), '');
  v_note jsonb;
  v_history jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_step_order NOT IN (2, 3) THEN
    RAISE EXCEPTION 'invalid step';
  END IF;
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'reject reason required';
  END IF;

  SELECT * INTO v_doc
  FROM core.risk_assessments
  WHERE id = p_assessment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;
  IF NOT app.is_org_member(v_doc.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_doc.status NOT IN ('REVIEW_PENDING', 'APPROVAL_PENDING') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  SELECT * INTO v_line
  FROM core.document_approval_lines
  WHERE assessment_id = v_doc.id
    AND step_order = p_step_order
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'line not found';
  END IF;
  IF v_line.action_status <> 'WAIT' THEN
    RAISE EXCEPTION 'line not waiting';
  END IF;
  IF v_line.assignee_id <> v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE core.document_approval_lines
  SET
    action_status = 'REJECTED',
    comment = v_reason,
    action_at = now()
  WHERE id = v_line.id;

  v_note := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'reason', v_reason,
    'rejectedBy', v_uid::text,
    'rejectedAt', to_jsonb(now()),
    'stepOrder', p_step_order
  );
  v_history := COALESCE(v_doc.snapshot_payload->'rejectionHistory', '[]'::jsonb);
  IF jsonb_typeof(v_history) <> 'array' THEN
    v_history := '[]'::jsonb;
  END IF;

  UPDATE core.risk_assessments
  SET
    status = 'DRAFT',
    snapshot_payload = jsonb_set(
      COALESCE(snapshot_payload, '{}'::jsonb),
      '{rejectionHistory}',
      v_history || jsonb_build_array(v_note),
      true
    ),
    updated_at = now()
  WHERE id = v_doc.id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.reject_risk_assessment_step(uuid, int, text)
  TO app_user, app_admin, authenticator;

-- ---------------------------------------------------------------------------
-- RPC: revise_risk_assessment
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.revise_risk_assessment(
  p_assessment_id uuid,
  p_revision_type text,
  p_revision_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_doc core.risk_assessments%ROWTYPE;
  v_uid uuid := app.current_user_id();
  v_type text := upper(NULLIF(btrim(COALESCE(p_revision_type, '')), ''));
  v_reason text := NULLIF(btrim(COALESCE(p_revision_reason, '')), '');
  v_payload jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF v_type IS NULL OR v_type NOT IN ('PERIODIC', 'OCCASIONAL') THEN
    RAISE EXCEPTION 'invalid revision type';
  END IF;
  IF v_reason IS NULL OR char_length(v_reason) < 4 THEN
    RAISE EXCEPTION 'revision reason required';
  END IF;

  SELECT * INTO v_doc
  FROM core.risk_assessments
  WHERE id = p_assessment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;
  IF NOT app.is_org_member(v_doc.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_doc.status NOT IN ('APPROVED', 'LOCKED') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  IF v_doc.created_by <> v_uid AND NOT core.can_manage_risk_assessments(v_doc.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM core.document_approval_lines WHERE assessment_id = v_doc.id;

  v_payload := COALESCE(v_doc.snapshot_payload, '{}'::jsonb);
  v_payload := jsonb_set(v_payload, '{_pendingRevisionType}', to_jsonb(v_type), true);
  v_payload := jsonb_set(v_payload, '{_pendingRevisionReason}', to_jsonb(v_reason), true);

  UPDATE core.risk_assessments
  SET
    status = 'DRAFT',
    current_version = v_doc.current_version + 1,
    occasional_review_required = (v_type = 'OCCASIONAL'),
    snapshot_payload = v_payload,
    updated_at = now()
  WHERE id = v_doc.id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.revise_risk_assessment(uuid, text, text)
  TO app_user, app_admin, authenticator;

-- ---------------------------------------------------------------------------
-- RPC: complete_risk_assessment_repledge
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.complete_risk_assessment_repledge(
  p_repledge_id uuid,
  p_signature text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_row core.risk_assessment_worker_repledges%ROWTYPE;
  v_uid uuid := app.current_user_id();
  v_sig text := NULLIF(btrim(COALESCE(p_signature, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF v_sig IS NULL THEN
    RAISE EXCEPTION 'signature required';
  END IF;

  SELECT * INTO v_row
  FROM core.risk_assessment_worker_repledges
  WHERE id = p_repledge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;
  IF NOT app.is_org_member(v_row.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_row.worker_user_id <> v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_row.pledged_at IS NOT NULL THEN
    RAISE EXCEPTION 'already pledged';
  END IF;

  UPDATE core.risk_assessment_worker_repledges
  SET
    pledged_at = now(),
    signature_data = v_sig
  WHERE id = v_row.id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.complete_risk_assessment_repledge(uuid, text)
  TO app_user, app_admin, authenticator;

COMMENT ON FUNCTION core.submit_risk_assessment_for_review(uuid, uuid) IS
  '위험성평가 초안 검토 요청. 1작성 승인 + 2검토 WAIT.';
COMMENT ON FUNCTION core.approve_risk_assessment_step(uuid, int, text, text, uuid) IS
  '위험성평가 검토/승인 단계 처리. 최종 승인 시 WORM 개정 + 재서약 시드.';
COMMENT ON FUNCTION core.reject_risk_assessment_step(uuid, int, text) IS
  '위험성평가 반려 → DRAFT + rejectionHistory.';
COMMENT ON FUNCTION core.revise_risk_assessment(uuid, text, text) IS
  '승인본 개정 초안 개방. 버전+1, DRAFT.';
COMMENT ON FUNCTION core.complete_risk_assessment_repledge(uuid, text) IS
  '작업자 TBM 재서약 완료.';

-- PostgREST: NOTIFY pgrst, 'reload schema';
