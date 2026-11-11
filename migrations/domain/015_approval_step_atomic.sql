-- 전자결재 단계 원자 처리: 대기 step + 호출자=승인자만 허용 (스텁 교체)

DROP FUNCTION IF EXISTS core.process_approval_step_atomic(uuid, text, text);

CREATE OR REPLACE FUNCTION core.process_approval_step_atomic(
  p_request_id uuid,
  p_step_id uuid,
  p_action text,
  p_comment text DEFAULT NULL,
  p_signature_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_req core.approval_requests%ROWTYPE;
  v_step core.approval_steps%ROWTYPE;
  v_actor uuid := app.current_user_id();
  v_action text := lower(btrim(COALESCE(p_action, '')));
  v_now timestamptz := now();
  v_next core.approval_steps%ROWTYPE;
  v_is_final boolean := false;
  v_reason text;
  v_content jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_req FROM core.approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'REQUEST_NOT_FOUND');
  END IF;
  IF NOT app.is_org_member(v_req.organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;
  IF v_req.status IS DISTINCT FROM 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'REQUEST_NOT_PENDING');
  END IF;

  SELECT * INTO v_step
  FROM core.approval_steps
  WHERE id = p_step_id AND request_id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'STEP_NOT_FOUND');
  END IF;
  IF v_step.status IS DISTINCT FROM 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'STEP_NOT_PENDING');
  END IF;
  IF v_step.step_order IS DISTINCT FROM v_req.current_step_order THEN
    RETURN jsonb_build_object('success', false, 'error', 'STEP_OUT_OF_ORDER');
  END IF;
  IF v_step.approver_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_STEP_APPROVER');
  END IF;

  IF v_action IN ('approve', 'approved') THEN
    UPDATE core.approval_steps
    SET
      status = 'approved',
      comment = NULLIF(btrim(COALESCE(p_comment, '')), ''),
      signature_url = NULLIF(btrim(COALESCE(p_signature_url, '')), ''),
      processed_at = v_now
    WHERE id = v_step.id;

    SELECT * INTO v_next
    FROM core.approval_steps
    WHERE request_id = p_request_id
      AND step_order = v_step.step_order + 1
    LIMIT 1;

    IF FOUND THEN
      UPDATE core.approval_steps
      SET status = 'pending'
      WHERE id = v_next.id;
      UPDATE core.approval_requests
      SET
        current_step_order = v_next.step_order,
        updated_at = v_now
      WHERE id = p_request_id;
      v_is_final := false;
      RETURN jsonb_build_object(
        'success', true,
        'action', 'approved',
        'is_final', false,
        'request_id', p_request_id,
        'step_id', p_step_id
      );
    END IF;

    UPDATE core.approval_requests
    SET
      status = 'approved',
      final_approved_at = v_now,
      rejection_reason = NULL,
      updated_at = v_now
    WHERE id = p_request_id;
    v_is_final := true;
    RETURN jsonb_build_object(
      'success', true,
      'action', 'approved',
      'is_final', true,
      'request_id', p_request_id,
      'step_id', p_step_id
    );
  END IF;

  IF v_action IN ('reject', 'rejected') THEN
    v_reason := btrim(COALESCE(p_comment, ''));
    IF v_reason = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'REJECTION_REASON_REQUIRED');
    END IF;

    UPDATE core.approval_steps
    SET
      status = 'rejected',
      comment = v_reason,
      processed_at = v_now
    WHERE id = v_step.id;

    UPDATE core.approval_steps
    SET
      status = 'waiting',
      comment = NULL,
      signature_url = NULL,
      processed_at = NULL
    WHERE request_id = p_request_id
      AND step_order > v_step.step_order;

    v_content := COALESCE(v_req.content, '{}'::jsonb);
    v_content := jsonb_set(
      v_content,
      '{rejectionHistory}',
      COALESCE(v_content->'rejectionHistory', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'id', 'reject-' || to_char(v_now, 'YYYYMMDDHH24MISSMS'),
            'stepOrder', v_step.step_order,
            'reason', v_reason,
            'rejectedAt', v_now
          )
        ),
      true
    );

    -- 도메인 엔진과 동일: 반려 후 재상신을 위해 draft
    UPDATE core.approval_requests
    SET
      status = 'draft',
      rejected_at = v_now,
      rejection_reason = v_reason,
      current_step_order = 1,
      content = v_content,
      updated_at = v_now
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'rejected',
      'is_final', true,
      'request_id', p_request_id,
      'step_id', p_step_id
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_ACTION');
END;
$$;

GRANT EXECUTE ON FUNCTION core.process_approval_step_atomic(uuid, uuid, text, text, text)
  TO app_user, app_admin;

COMMENT ON FUNCTION core.process_approval_step_atomic(uuid, uuid, text, text, text) IS
  '대기 중인 결재 단계를 호출자(승인자)만 승인·반려. 반려 시 문서는 draft로 되돌려 재상신 가능.';
