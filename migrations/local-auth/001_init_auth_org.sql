-- ep_auth: 사내/로컬 커스텀 인증·조직·직급 스키마 (001)
CREATE SCHEMA IF NOT EXISTS ep_auth;

CREATE TABLE IF NOT EXISTS ep_auth.schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ep_auth.app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ep_auth.app_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES ep_auth.app_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ep_auth.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry_type TEXT NOT NULL,
  slug TEXT,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  public_code TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ep_auth.organization_roles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES ep_auth.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rank_order INTEGER NOT NULL DEFAULT 100,
  permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS ep_auth.organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES ep_auth.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES ep_auth.app_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  staff_id TEXT,
  parent_customer_id TEXT,
  is_current_context BOOLEAN NOT NULL DEFAULT FALSE,
  organization_role_id TEXT REFERENCES ep_auth.organization_roles(id) ON DELETE SET NULL,
  feature_permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, user_id)
);
