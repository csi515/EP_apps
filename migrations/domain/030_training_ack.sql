-- 교육관리(training_ack): 교육 게시 · 부서/개인 배정 · 이수 확인(acked_at) 감사 로그

CREATE TABLE IF NOT EXISTS core.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_courses_org_status
  ON core.training_courses (organization_id, status, updated_at DESC);

COMMENT ON TABLE core.training_courses IS '교육관리: 교육 본문·게시 상태';

CREATE TABLE IF NOT EXISTS core.training_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES core.training_courses(id) ON DELETE CASCADE,
  department_id uuid REFERENCES core.departments(id) ON DELETE CASCADE,
  member_id uuid REFERENCES core.organization_members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_assignees_target_chk CHECK (
    (department_id IS NOT NULL AND member_id IS NULL)
    OR (department_id IS NULL AND member_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_training_assignees_dept
  ON core.training_assignees (organization_id, course_id, department_id)
  WHERE department_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_training_assignees_member
  ON core.training_assignees (organization_id, course_id, member_id)
  WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_training_assignees_course
  ON core.training_assignees (course_id);

COMMENT ON TABLE core.training_assignees IS '교육관리: 부서 또는 개인 배정';

CREATE TABLE IF NOT EXISTS core.training_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES core.training_courses(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  course_revision integer NOT NULL DEFAULT 1,
  acked_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_acknowledgments_org_course_member_uq
    UNIQUE (organization_id, course_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_training_acknowledgments_course
  ON core.training_acknowledgments (course_id, acked_at DESC);

COMMENT ON TABLE core.training_acknowledgments IS
  '교육관리: 이수 확인 감사 로그 (acked_at = 버튼 클릭 시각)';

ALTER TABLE core.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.training_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.training_acknowledgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS training_courses_all ON core.training_courses;
CREATE POLICY training_courses_all ON core.training_courses
  FOR ALL
  USING (app.is_org_member(organization_id))
  WITH CHECK (app.is_org_member(organization_id));

DROP POLICY IF EXISTS training_assignees_all ON core.training_assignees;
CREATE POLICY training_assignees_all ON core.training_assignees
  FOR ALL
  USING (app.is_org_member(organization_id))
  WITH CHECK (app.is_org_member(organization_id));

DROP POLICY IF EXISTS training_acknowledgments_all ON core.training_acknowledgments;
CREATE POLICY training_acknowledgments_all ON core.training_acknowledgments
  FOR ALL
  USING (app.is_org_member(organization_id))
  WITH CHECK (app.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.training_courses TO app_user, authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.training_assignees TO app_user, authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.training_acknowledgments TO app_user, authenticator;
