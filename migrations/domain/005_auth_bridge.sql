-- Auth API 브릿지: 세션 컨텍스트·PostgREST·감사·직급 순위

ALTER TABLE app.users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

ALTER TABLE core.organization_members
  ADD COLUMN IF NOT EXISTS is_current_context boolean NOT NULL DEFAULT false;

ALTER TABLE core.organization_roles
  ADD COLUMN IF NOT EXISTS rank_order integer NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS app.auth_audit_log (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  actor_user_id uuid,
  target_user_id uuid,
  organization_id uuid,
  detail_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_audit_log_created_at_idx
  ON app.auth_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS auth_audit_log_event_type_idx
  ON app.auth_audit_log (event_type, created_at DESC);

-- PostgREST authenticator (LOGIN) → SET ROLE app_user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'ep_authenticator';
  END IF;
END $$;

GRANT app_user TO authenticator;
GRANT USAGE ON SCHEMA app, core TO authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO authenticator;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO authenticator;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO authenticator;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO authenticator;

CREATE OR REPLACE FUNCTION app.postgrest_pre_request()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
DECLARE
  claims json;
  uid text;
BEGIN
  BEGIN
    claims := nullif(current_setting('request.jwt.claims', true), '')::json;
  EXCEPTION WHEN others THEN
    claims := NULL;
  END;
  IF claims IS NULL THEN
    RETURN;
  END IF;
  uid := coalesce(claims->>'sub', claims->'user_metadata'->>'sub');
  IF uid IS NOT NULL AND length(btrim(uid)) > 0 THEN
    PERFORM set_config('app.user_id', uid, true);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION app.postgrest_pre_request() TO authenticator, app_user, app_admin;

GRANT SELECT, INSERT ON app.auth_audit_log TO app_user, app_admin;
