-- EP_apps 로그인. 계정은 app.users, 세션은 app.sessions 에 둔다.
-- 앱 서버는 요청마다 SET LOCAL app.user_id = '<uuid>' 를 설정한 뒤 app_user 롤로 쿼리한다.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin NOLOGIN;
  END IF;
END $$;

ALTER ROLE app_admin BYPASSRLS;

CREATE TABLE IF NOT EXISTS app.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  password_hash text NOT NULL,
  full_name     text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_blank CHECK (length(btrim(email)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower
  ON app.users (lower(email));

CREATE TABLE IF NOT EXISTS app.sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id ON app.sessions (user_id);

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON app.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON app.users
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE OR REPLACE FUNCTION app.register_user(
  p_email text,
  p_password text,
  p_full_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
DECLARE
  v_id uuid;
  v_email text := lower(btrim(p_email));
BEGIN
  IF v_email IS NULL OR v_email = '' OR position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION '이메일을 입력해 주세요.';
  END IF;
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION '비밀번호는 8자 이상이어야 합니다.';
  END IF;
  INSERT INTO app.users (email, password_hash, full_name)
  VALUES (v_email, crypt(p_password, gen_salt('bf')), NULLIF(btrim(COALESCE(p_full_name, '')), ''))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION app.login(
  p_email text,
  p_password text,
  p_ttl interval DEFAULT interval '12 hours'
)
RETURNS TABLE(user_id uuid, session_token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
DECLARE
  v_user app.users%ROWTYPE;
  v_token text;
  v_expires timestamptz;
BEGIN
  SELECT * INTO v_user
  FROM app.users
  WHERE lower(email) = lower(btrim(p_email))
    AND is_active = true;

  IF NOT FOUND OR v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    RAISE EXCEPTION '이메일 또는 비밀번호가 올바르지 않습니다.';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires := now() + p_ttl;
  INSERT INTO app.sessions (user_id, token_hash, expires_at)
  VALUES (v_user.id, encode(digest(v_token, 'sha256'), 'hex'), v_expires);

  user_id := v_user.id;
  session_token := v_token;
  expires_at := v_expires;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION app.resolve_session(p_token text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  SELECT s.user_id
  FROM app.sessions s
  JOIN app.users u ON u.id = s.user_id
  WHERE s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND s.revoked_at IS NULL
    AND s.expires_at > now()
    AND u.is_active = true;
$$;

CREATE OR REPLACE FUNCTION app.logout(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = app, public
AS $$
  UPDATE app.sessions
  SET revoked_at = now()
  WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND revoked_at IS NULL;
$$;

REVOKE ALL ON app.users FROM PUBLIC;
REVOKE ALL ON app.sessions FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO app_user, app_admin;
GRANT SELECT (id, email, full_name, is_active, created_at, updated_at) ON app.users TO app_user;
GRANT SELECT, INSERT, UPDATE ON app.sessions TO app_user;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO app_user, app_admin;
GRANT EXECUTE ON FUNCTION app.register_user(text, text, text) TO app_user, app_admin;
GRANT EXECUTE ON FUNCTION app.login(text, text, interval) TO app_user, app_admin;
GRANT EXECUTE ON FUNCTION app.resolve_session(text) TO app_user, app_admin;
GRANT EXECUTE ON FUNCTION app.logout(text) TO app_user, app_admin;
GRANT ALL ON SCHEMA app TO app_admin;
GRANT ALL ON ALL TABLES IN SCHEMA app TO app_admin;

ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_self_read ON app.users;
CREATE POLICY users_self_read ON app.users
  FOR SELECT TO app_user
  USING (id = app.current_user_id());

DROP POLICY IF EXISTS sessions_self ON app.sessions;
CREATE POLICY sessions_self ON app.sessions
  FOR ALL TO app_user
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());
