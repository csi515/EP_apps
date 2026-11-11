-- 연구과제 관련 자료(외부 링크)

CREATE TABLE IF NOT EXISTS core.research_project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES core.research_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_project_links_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT research_project_links_url_not_blank CHECK (length(btrim(url)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_research_project_links_project
  ON core.research_project_links (project_id, sort_order);

COMMENT ON TABLE core.research_project_links IS
  '연구과제 공통 관련 자료(드라이브·위키 등 외부 URL). 파일 업로드 없음.';

ALTER TABLE core.research_project_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON core.research_project_links;
CREATE POLICY tenant_isolation ON core.research_project_links
  FOR ALL TO app_user
  USING (app.is_org_member(organization_id))
  WITH CHECK (app.is_org_member(organization_id));
