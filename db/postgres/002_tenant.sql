-- EP_apps 테넌트. 조직·멤버·직급·부서. 로그인 사용자는 app.users 를 참조한다.

CREATE SCHEMA IF NOT EXISTS core;

GRANT USAGE ON SCHEMA core TO app_user, app_admin;

CREATE OR REPLACE FUNCTION core.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TYPE core.member_role AS ENUM ('owner', 'admin', 'manager', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE core.org_lifecycle_status AS ENUM ('pending', 'active', 'suspended', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS core.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry_type text NOT NULL DEFAULT 'personal_plant_ops',
  slug text UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  business_registration_number varchar(12) UNIQUE,
  lifecycle_status core.org_lifecycle_status NOT NULL DEFAULT 'active',
  public_code varchar(8) UNIQUE,
  active_capabilities text[] NOT NULL DEFAULT '{}',
  postal text,
  sido text,
  sigungu text,
  dong text,
  jibun text,
  road_address text,
  address_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES app.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  department_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.organization_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name varchar(64) NOT NULL,
  description varchar(255) NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_roles_tenant_name
  ON core.organization_roles (tenant_id, name);

CREATE TABLE IF NOT EXISTS core.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  role core.member_role NOT NULL DEFAULT 'staff',
  staff_id uuid REFERENCES core.staff(id) ON DELETE SET NULL,
  parent_customer_id uuid,
  organization_role_id uuid REFERENCES core.organization_roles(id) ON DELETE SET NULL,
  custom_role_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  feature_permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  token_version integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_active_user
  ON core.organization_members (organization_id, user_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS core.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES core.departments(id) ON DELETE RESTRICT,
  name varchar(64) NOT NULL,
  path text NOT NULL,
  depth integer NOT NULL DEFAULT 1,
  manager_staff_id uuid REFERENCES core.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT departments_name_len CHECK (length(btrim(name)) > 0)
);

ALTER TABLE core.staff
  DROP CONSTRAINT IF EXISTS staff_department_id_fkey;
ALTER TABLE core.staff
  ADD CONSTRAINT staff_department_id_fkey
  FOREIGN KEY (department_id) REFERENCES core.departments(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS core.department_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES core.departments(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  custom_role_id uuid REFERENCES core.organization_roles(id) ON DELETE SET NULL,
  scope_type varchar(16) NOT NULL DEFAULT 'SELF_ONLY',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT department_members_scope_check CHECK (scope_type IN ('GLOBAL', 'DESCENDANTS', 'SELF_ONLY')),
  CONSTRAINT department_members_unique UNIQUE (department_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_departments_tenant_path
  ON core.departments (organization_id, path);
CREATE INDEX IF NOT EXISTS idx_staff_department ON core.staff (department_id);

CREATE OR REPLACE FUNCTION app.is_org_member(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    WHERE m.organization_id = p_org
      AND m.user_id = app.current_user_id()
      AND m.is_active = true
      AND m.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION core.member_has_feature_grant(p_org_id uuid, p_feature_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    WHERE m.organization_id = p_org_id
      AND m.user_id = app.current_user_id()
      AND m.is_active = true
      AND m.deleted_at IS NULL
      AND (
        m.role = 'owner'
        OR COALESCE((m.feature_permissions->>p_feature_key)::boolean, false)
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.generate_public_code()
RETURNS varchar(8)
LANGUAGE plpgsql
AS $$
DECLARE
  v_code varchar(8);
BEGIN
  LOOP
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM core.organizations WHERE public_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

-- 사업장 전화번호는 선택값이다. 빈 값·NULL은 저장하지 않는다.
CREATE OR REPLACE FUNCTION core.create_organization(
  p_name text,
  p_business_registration_number text,
  p_representative_name text,
  p_business_phone text,
  p_business_address text,
  p_industry_category text,
  p_industry_type text DEFAULT 'personal_plant_ops',
  p_slug text DEFAULT NULL,
  p_settings jsonb DEFAULT '{}'::jsonb,
  p_postal text DEFAULT NULL,
  p_sido text DEFAULT NULL,
  p_sigungu text DEFAULT NULL,
  p_dong text DEFAULT NULL,
  p_jibun text DEFAULT NULL,
  p_road_address text DEFAULT NULL,
  p_address_detail text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := app.current_user_id();
  v_phone text;
  v_display_address text;
  v_public_code varchar(8);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF trim(p_name) = '' THEN
    RAISE EXCEPTION '사업장명을 입력해 주세요.';
  END IF;
  IF trim(p_representative_name) = '' THEN
    RAISE EXCEPTION '대표자명을 입력해 주세요.';
  END IF;
  IF trim(p_business_address) = '' THEN
    RAISE EXCEPTION '사업장 주소를 입력해 주세요.';
  END IF;
  IF trim(p_industry_category) = '' THEN
    RAISE EXCEPTION '업종을 입력해 주세요.';
  END IF;

  v_phone := NULLIF(btrim(COALESCE(p_business_phone, '')), '');
  v_display_address := trim(p_business_address);
  v_public_code := core.generate_public_code();
  p_settings := COALESCE(p_settings, '{}'::jsonb) || jsonb_build_object(
    'representativeName', trim(p_representative_name),
    'businessAddress', v_display_address,
    'industryCategory', trim(p_industry_category),
    'address', v_display_address
  );
  IF v_phone IS NOT NULL THEN
    p_settings := p_settings || jsonb_build_object('businessPhone', v_phone, 'phone', v_phone);
  END IF;

  INSERT INTO core.organizations (
    name, industry_type, slug, settings, public_code,
    postal, sido, sigungu, dong, jibun, road_address, address_detail,
    business_registration_number
  ) VALUES (
    trim(p_name),
    COALESCE(NULLIF(trim(p_industry_type), ''), 'personal_plant_ops'),
    NULLIF(btrim(COALESCE(p_slug, '')), ''),
    p_settings,
    v_public_code,
    NULLIF(btrim(COALESCE(p_postal, '')), ''),
    NULLIF(btrim(COALESCE(p_sido, '')), ''),
    NULLIF(btrim(COALESCE(p_sigungu, '')), ''),
    NULLIF(btrim(COALESCE(p_dong, '')), ''),
    NULLIF(btrim(COALESCE(p_jibun, '')), ''),
    NULLIF(btrim(COALESCE(p_road_address, '')), ''),
    NULLIF(trim(COALESCE(p_address_detail, '')), ''),
    NULLIF(btrim(COALESCE(p_business_registration_number, '')), '')
  )
  RETURNING id INTO v_org_id;

  INSERT INTO core.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION app.is_org_member(uuid) TO app_user, app_admin;
GRANT EXECUTE ON FUNCTION core.member_has_feature_grant(uuid, text) TO app_user, app_admin;
GRANT EXECUTE ON FUNCTION core.create_organization(
  text, text, text, text, text, text, text, text, jsonb,
  text, text, text, text, text, text, text
) TO app_user, app_admin;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO app_user;
GRANT ALL ON ALL TABLES IN SCHEMA core TO app_admin;
