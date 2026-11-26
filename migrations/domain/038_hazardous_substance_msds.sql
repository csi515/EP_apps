-- 유해화학물질·MSDS: hazardous_substances + chemical_usage_logs (W0 스키마만, 앱 플래그 미전환)

CREATE TABLE IF NOT EXISTS core.hazardous_substances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  formula text,
  cas_number text NOT NULL DEFAULT '',
  hazard_classes text[] NOT NULL DEFAULT '{}'::text[],
  ghs_pictograms text[] NOT NULL DEFAULT '{}'::text[],
  storage_cabinet_id text,
  storage_cabinet_name text NOT NULL DEFAULT '',
  current_stock numeric(14, 3) NOT NULL DEFAULT 0,
  min_safe_stock numeric(14, 3) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'mL',
  msds_pdf_url text,
  is_regulated_precursor boolean NOT NULL DEFAULT false,
  expiration_date date,
  notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hazardous_substances_org_active_idx
  ON core.hazardous_substances (organization_id, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS hazardous_substances_org_cas_idx
  ON core.hazardous_substances (organization_id, cas_number)
  WHERE btrim(cas_number) <> '';

COMMENT ON TABLE core.hazardous_substances IS
  '유해화학 시약·MSDS 대장 (useHazardousSubstanceReagents row shape)';

CREATE TABLE IF NOT EXISTS core.chemical_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  substance_id uuid NOT NULL REFERENCES core.hazardous_substances(id) ON DELETE CASCADE,
  reagent_name text NOT NULL DEFAULT '',
  used_at date NOT NULL DEFAULT (timezone('utc', now()))::date,
  user_id uuid,
  user_name text NOT NULL DEFAULT '',
  used_amount numeric(14, 3) NOT NULL DEFAULT 0,
  purpose text NOT NULL DEFAULT '',
  waste_generated_amount numeric(14, 3),
  waste_category text
    CHECK (
      waste_category IS NULL
      OR waste_category IN (
        'acid_waste',
        'base_waste',
        'organic_waste',
        'heavy_metal_waste'
      )
    ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chemical_usage_logs_org_substance_idx
  ON core.chemical_usage_logs (organization_id, substance_id, used_at DESC);

CREATE INDEX IF NOT EXISTS chemical_usage_logs_org_used_at_idx
  ON core.chemical_usage_logs (organization_id, used_at DESC);

COMMENT ON TABLE core.chemical_usage_logs IS
  '시약 수불·폐액 발생 이력 (hazardousSubstanceEngine ChemicalUsageRecord)';

-- safety:manage 위임 (SOP·위험성평가와 동일 담당자)
CREATE OR REPLACE FUNCTION core.can_manage_hazardous_substances(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    LEFT JOIN core.organization_roles r ON r.id = m.organization_role_id
    WHERE m.organization_id = p_org
      AND m.user_id = app.current_user_id()
      AND m.is_active = true
      AND m.deleted_at IS NULL
      AND (
        m.role IN ('owner', 'admin')
        OR app.is_org_admin_or_owner(p_org)
        OR COALESCE((r.permissions->>'safety:manage')::boolean, false)
        OR COALESCE((m.feature_permissions->>'safety:manage')::boolean, false)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION core.can_manage_hazardous_substances(uuid)
  TO app_user, app_admin, authenticator;

COMMENT ON FUNCTION core.can_manage_hazardous_substances(uuid) IS
  '유해화학·MSDS 담당(safety:manage) 또는 org admin/owner';

-- ---------------------------------------------------------------------------
-- RLS: hazardous_substances
-- ---------------------------------------------------------------------------

ALTER TABLE core.hazardous_substances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hazardous_substances_select ON core.hazardous_substances;
DROP POLICY IF EXISTS hazardous_substances_insert ON core.hazardous_substances;
DROP POLICY IF EXISTS hazardous_substances_update ON core.hazardous_substances;
DROP POLICY IF EXISTS hazardous_substances_delete ON core.hazardous_substances;

CREATE POLICY hazardous_substances_select ON core.hazardous_substances
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY hazardous_substances_insert ON core.hazardous_substances
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_hazardous_substances(organization_id)
  );

CREATE POLICY hazardous_substances_update ON core.hazardous_substances
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_hazardous_substances(organization_id)
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_hazardous_substances(organization_id)
  );

CREATE POLICY hazardous_substances_delete ON core.hazardous_substances
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_hazardous_substances(organization_id)
  );

-- ---------------------------------------------------------------------------
-- RLS: chemical_usage_logs (조회·수불 기록은 구성원, 수정·삭제는 safety 담당)
-- ---------------------------------------------------------------------------

ALTER TABLE core.chemical_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chemical_usage_logs_select ON core.chemical_usage_logs;
DROP POLICY IF EXISTS chemical_usage_logs_insert ON core.chemical_usage_logs;
DROP POLICY IF EXISTS chemical_usage_logs_update ON core.chemical_usage_logs;
DROP POLICY IF EXISTS chemical_usage_logs_delete ON core.chemical_usage_logs;

CREATE POLICY chemical_usage_logs_select ON core.chemical_usage_logs
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY chemical_usage_logs_insert ON core.chemical_usage_logs
  FOR INSERT TO app_user
  WITH CHECK (app.is_org_member(organization_id));

CREATE POLICY chemical_usage_logs_update ON core.chemical_usage_logs
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_hazardous_substances(organization_id)
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_hazardous_substances(organization_id)
  );

CREATE POLICY chemical_usage_logs_delete ON core.chemical_usage_logs
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_hazardous_substances(organization_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON core.hazardous_substances TO app_user, authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.chemical_usage_logs TO app_user, authenticator;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolsuper)
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ep') THEN
    ALTER TABLE core.hazardous_substances OWNER TO ep;
    ALTER TABLE core.chemical_usage_logs OWNER TO ep;
  END IF;
END $$;

-- PostgREST: NOTIFY pgrst, 'reload schema';