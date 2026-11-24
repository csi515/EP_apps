-- MBO Plan vs Actual: 월별 계획/실적 셀 + 과제 WBS 보조 컬럼

ALTER TABLE core.mbo_projects
  ADD COLUMN IF NOT EXISTS wbs_code text,
  ADD COLUMN IF NOT EXISTS wbs_seq integer;

COMMENT ON COLUMN core.mbo_projects.wbs_code IS '중분류 코드 (예: 1-1)';
COMMENT ON COLUMN core.mbo_projects.wbs_seq IS '세부 순번 (정렬용)';

CREATE TABLE IF NOT EXISTS core.mbo_project_month_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.mbo_projects(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  plan_text text,
  plan_status text NOT NULL DEFAULT 'normal'
    CHECK (plan_status IN ('normal', 'highlighted', 'changed_or_delayed')),
  actual_text text,
  actual_status text NOT NULL DEFAULT 'normal'
    CHECK (actual_status IN ('normal', 'highlighted', 'changed_or_delayed')),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mbo_project_month_cells_org_project_ym_uq
    UNIQUE (organization_id, project_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_mbo_project_month_cells_org_year
  ON core.mbo_project_month_cells (organization_id, year);

CREATE INDEX IF NOT EXISTS idx_mbo_project_month_cells_project
  ON core.mbo_project_month_cells (project_id, year, month);

COMMENT ON TABLE core.mbo_project_month_cells IS
  '실행 과제 월별 계획/실적 짧은 마일스톤 (장문 progress_logs 와 병행)';

ALTER TABLE core.mbo_project_month_cells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mbo_project_month_cells_all ON core.mbo_project_month_cells;
CREATE POLICY mbo_project_month_cells_all ON core.mbo_project_month_cells
  FOR ALL
  USING (app.is_org_member(organization_id))
  WITH CHECK (app.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.mbo_project_month_cells TO app_user, authenticator;
