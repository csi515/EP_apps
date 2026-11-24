-- 노경 건의: 본인 기명 글에 한해 UPDATE/DELETE 허용 (담당자 권한은 유지)

DROP POLICY IF EXISTS anonymous_grievances_update ON core.anonymous_grievances;
DROP POLICY IF EXISTS anonymous_grievances_delete ON core.anonymous_grievances;

CREATE POLICY anonymous_grievances_update ON core.anonymous_grievances
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.can_manage_grievances(organization_id)
      OR (
        visibility = 'named'
        AND author_user_id = app.current_user_id()
        AND status = 'SUBMITTED'
      )
    )
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      app.can_manage_grievances(organization_id)
      OR (
        visibility = 'named'
        AND author_user_id = app.current_user_id()
        AND status = 'SUBMITTED'
      )
    )
  );

CREATE POLICY anonymous_grievances_delete ON core.anonymous_grievances
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      app.can_manage_grievances(organization_id)
      OR (
        visibility = 'named'
        AND author_user_id = app.current_user_id()
        AND status = 'SUBMITTED'
      )
    )
  );

COMMENT ON POLICY anonymous_grievances_update ON core.anonymous_grievances IS
  '담당자 전체 수정 또는 본인 기명·접수대기(SUBMITTED) 글 수정';
COMMENT ON POLICY anonymous_grievances_delete ON core.anonymous_grievances IS
  '담당자 삭제 또는 본인 기명·접수대기(SUBMITTED) 글 삭제';
