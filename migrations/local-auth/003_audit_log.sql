-- ep_auth: 로그인·권한 변경 감사 로그 + 컬럼 보강 (003)
ALTER TABLE ep_auth.app_users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE ep_auth.organization_roles
  ADD COLUMN IF NOT EXISTS rank_order INTEGER NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS ep_auth.auth_audit_log (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_user_id TEXT,
  target_user_id TEXT,
  organization_id TEXT,
  detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_audit_log_created_at_idx
  ON ep_auth.auth_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS auth_audit_log_event_type_idx
  ON ep_auth.auth_audit_log (event_type, created_at DESC);
