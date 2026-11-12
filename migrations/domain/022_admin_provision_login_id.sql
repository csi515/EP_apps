-- 관리자 계정 발급: login_id 로그인 + admin_provision_member RPC

-- 1) login_id 컬럼 (기존 email 로 백필)
ALTER TABLE app.users
  ADD COLUMN IF NOT EXISTS login_id text;

UPDATE app.users
SET login_id = lower(btrim(email))
WHERE login_id IS NULL
  AND email IS NOT NULL
  AND length(btrim(email)) > 0;

-- 백필 후에도 NULL 이면 id 기반 placeholder
UPDATE app.users
SET login_id = 'user_' || replace(id::text, '-', '')
WHERE login_id IS NULL OR btrim(login_id) = '';

ALTER TABLE app.users
  ALTER COLUMN login_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_login_id_lower
  ON app.users (lower(login_id));

-- email 은 연락용으로 선택값 (신규 발급 계정은 NULL 가능)
ALTER TABLE app.users
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE app.users
  DROP CONSTRAINT IF EXISTS users_email_not_blank;

ALTER TABLE app.users
  ADD CONSTRAINT users_email_not_blank CHECK (
    email IS NULL OR length(btrim(email)) > 0
  );

ALTER TABLE app.users
  ADD CONSTRAINT users_login_id_not_blank CHECK (length(btrim(login_id)) > 0);

-- 2) 로그인: login_id 우선, 레거시 email 호환
-- 파라미터 이름 변경(p_email → p_login_id)은 CREATE OR REPLACE 불가 → DROP 후 재생성
DROP FUNCTION IF EXISTS app.login(text, text, interval);
CREATE OR REPLACE FUNCTION app.login(
  p_login_id text,
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
  v_key text := lower(btrim(p_login_id));
BEGIN
  SELECT * INTO v_user
  FROM app.users
  WHERE is_active = true
    AND (
      lower(login_id) = v_key
      OR (email IS NOT NULL AND lower(email) = v_key)
    )
  ORDER BY CASE WHEN lower(login_id) = v_key THEN 0 ELSE 1 END
  LIMIT 1;

  IF NOT FOUND OR v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    RAISE EXCEPTION '아이디 또는 비밀번호가 올바르지 않습니다.';
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

-- 공개 자가가입은 login_id 기반으로 유지하되 email 형식 강제 해제 (관리자 발급이 주 경로)
DROP FUNCTION IF EXISTS app.register_user(text, text, text);
CREATE OR REPLACE FUNCTION app.register_user(
  p_login_id text,
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
  v_login text := lower(btrim(p_login_id));
BEGIN
  IF v_login IS NULL OR v_login = '' OR length(v_login) < 2 THEN
    RAISE EXCEPTION '아이디를 입력해 주세요.';
  END IF;
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION '비밀번호는 8자 이상이어야 합니다.';
  END IF;
  INSERT INTO app.users (login_id, email, password_hash, full_name, must_change_password)
  VALUES (
    v_login,
    NULL,
    crypt(p_password, gen_salt('bf')),
    NULLIF(btrim(COALESCE(p_full_name, '')), ''),
    false
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION app.login(text, text, interval) TO app_user, app_admin;
GRANT EXECUTE ON FUNCTION app.register_user(text, text, text) TO app_user, app_admin;
GRANT SELECT (id, email, login_id, full_name, is_active, must_change_password, created_at, updated_at)
  ON app.users TO app_user;

-- 3) 호출자 권한 헬퍼: owner/admin 또는 members:manage
CREATE OR REPLACE FUNCTION core.caller_can_manage_members(p_org_id uuid)
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
    WHERE m.organization_id = p_org_id
      AND m.user_id = app.current_user_id()
      AND m.is_active = true
      AND m.deleted_at IS NULL
      AND (
        m.role IN ('owner', 'admin')
        OR COALESCE((m.feature_permissions->>'members:manage')::boolean, false)
        OR COALESCE((m.feature_permissions->>'members_manage')::boolean, false)
        OR COALESCE((r.permissions->>'members:manage')::boolean, false)
        OR COALESCE((r.permissions->>'members_manage')::boolean, false)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION core.caller_can_manage_members(uuid) TO app_user, app_admin, authenticator;

-- 4) 관리자 임직원 발급 (원자)
CREATE OR REPLACE FUNCTION core.admin_provision_member(
  p_org_id uuid,
  p_login_id text,
  p_password text,
  p_full_name text,
  p_base_role core.member_role DEFAULT 'staff',
  p_organization_role_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_scope_type varchar(16) DEFAULT 'SELF_ONLY'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_actor uuid := app.current_user_id();
  v_login text := lower(btrim(p_login_id));
  v_name text := NULLIF(btrim(COALESCE(p_full_name, '')), '');
  v_user_id uuid;
  v_staff_id uuid;
  v_member_id uuid;
  v_scope text := COALESCE(NULLIF(btrim(p_scope_type), ''), 'SELF_ONLY');
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;
  IF NOT core.caller_can_manage_members(p_org_id) THEN
    RAISE EXCEPTION '임직원을 등록할 권한이 없습니다.';
  END IF;
  IF v_login IS NULL OR length(v_login) < 2 THEN
    RAISE EXCEPTION '아이디는 2자 이상이어야 합니다.';
  END IF;
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION '비밀번호는 8자 이상이어야 합니다.';
  END IF;
  IF p_base_role = 'owner' THEN
    RAISE EXCEPTION '대표이사(owner) 역할은 직접 발급할 수 없습니다.';
  END IF;
  IF v_scope NOT IN ('GLOBAL', 'DESCENDANTS', 'SELF_ONLY') THEN
    RAISE EXCEPTION '잘못된 부서 스코프입니다.';
  END IF;

  IF EXISTS (SELECT 1 FROM app.users WHERE lower(login_id) = v_login) THEN
    RAISE EXCEPTION '이미 사용 중인 아이디입니다.';
  END IF;

  IF p_organization_role_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM core.organization_roles
      WHERE id = p_organization_role_id AND tenant_id = p_org_id
    ) THEN
      RAISE EXCEPTION '유효하지 않은 직급입니다.';
    END IF;
  END IF;

  IF p_department_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM core.departments
      WHERE id = p_department_id AND organization_id = p_org_id
    ) THEN
      RAISE EXCEPTION '유효하지 않은 부서입니다.';
    END IF;
  END IF;

  INSERT INTO app.users (login_id, email, password_hash, full_name, must_change_password, is_active)
  VALUES (
    v_login,
    NULL,
    crypt(p_password, gen_salt('bf')),
    v_name,
    true,
    true
  )
  RETURNING id INTO v_user_id;

  INSERT INTO core.staff (organization_id, user_id, name, email, status, department_id)
  VALUES (
    p_org_id,
    v_user_id,
    COALESCE(v_name, v_login),
    NULL,
    'active',
    p_department_id
  )
  RETURNING id INTO v_staff_id;

  INSERT INTO core.organization_members (
    organization_id, user_id, role, staff_id, organization_role_id, is_active, feature_permissions
  )
  VALUES (
    p_org_id,
    v_user_id,
    p_base_role,
    v_staff_id,
    p_organization_role_id,
    true,
    '{}'::jsonb
  )
  RETURNING id INTO v_member_id;

  IF p_department_id IS NOT NULL THEN
    INSERT INTO core.department_members (
      organization_id, department_id, member_id, scope_type
    )
    VALUES (p_org_id, p_department_id, v_member_id, v_scope)
    ON CONFLICT (department_id, member_id) DO UPDATE
      SET scope_type = EXCLUDED.scope_type;
  END IF;

  INSERT INTO app.auth_audit_log (
    event_type, actor_user_id, target_user_id, organization_id, detail_json
  )
  VALUES (
    'member_provisioned',
    v_actor,
    v_user_id,
    p_org_id,
    jsonb_build_object(
      'login_id', v_login,
      'member_id', v_member_id,
      'staff_id', v_staff_id,
      'base_role', p_base_role,
      'organization_role_id', p_organization_role_id,
      'department_id', p_department_id
    )
  );

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'member_id', v_member_id,
    'staff_id', v_staff_id,
    'login_id', v_login,
    'full_name', v_name,
    'must_change_password', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.admin_provision_member(
  uuid, text, text, text, core.member_role, uuid, uuid, varchar
) TO app_user, app_admin, authenticator;

-- 5) 관리자 비밀번호 재설정
CREATE OR REPLACE FUNCTION core.admin_reset_member_password(
  p_org_id uuid,
  p_member_id uuid,
  p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_actor uuid := app.current_user_id();
  v_target_user uuid;
  v_target_role core.member_role;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;
  IF NOT core.caller_can_manage_members(p_org_id) THEN
    RAISE EXCEPTION '비밀번호를 재설정할 권한이 없습니다.';
  END IF;
  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RAISE EXCEPTION '비밀번호는 8자 이상이어야 합니다.';
  END IF;

  SELECT user_id, role INTO v_target_user, v_target_role
  FROM core.organization_members
  WHERE id = p_member_id
    AND organization_id = p_org_id
    AND deleted_at IS NULL;

  IF v_target_user IS NULL THEN
    RAISE EXCEPTION '대상 임직원을 찾을 수 없습니다.';
  END IF;
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION '대표이사의 비밀번호는 이 경로로 재설정할 수 없습니다.';
  END IF;

  UPDATE app.users
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      must_change_password = true,
      updated_at = now()
  WHERE id = v_target_user;

  INSERT INTO app.auth_audit_log (
    event_type, actor_user_id, target_user_id, organization_id, detail_json
  )
  VALUES (
    'password_reset_by_admin',
    v_actor,
    v_target_user,
    p_org_id,
    jsonb_build_object('member_id', p_member_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.admin_reset_member_password(uuid, uuid, text)
  TO app_user, app_admin, authenticator;

-- 6) 관리자 활성/비활성
CREATE OR REPLACE FUNCTION core.admin_deactivate_member(
  p_org_id uuid,
  p_member_id uuid,
  p_is_active boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_actor uuid := app.current_user_id();
  v_target_user uuid;
  v_target_role core.member_role;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;
  IF NOT core.caller_can_manage_members(p_org_id) THEN
    RAISE EXCEPTION '임직원 상태를 변경할 권한이 없습니다.';
  END IF;

  SELECT user_id, role INTO v_target_user, v_target_role
  FROM core.organization_members
  WHERE id = p_member_id
    AND organization_id = p_org_id
    AND deleted_at IS NULL;

  IF v_target_user IS NULL THEN
    RAISE EXCEPTION '대상 임직원을 찾을 수 없습니다.';
  END IF;
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION '대표이사는 비활성화할 수 없습니다.';
  END IF;
  IF v_target_user = v_actor THEN
    RAISE EXCEPTION '본인 계정은 비활성화할 수 없습니다.';
  END IF;

  UPDATE core.organization_members
  SET is_active = p_is_active,
      updated_at = now()
  WHERE id = p_member_id;

  UPDATE app.users
  SET is_active = p_is_active,
      updated_at = now()
  WHERE id = v_target_user;

  INSERT INTO app.auth_audit_log (
    event_type, actor_user_id, target_user_id, organization_id, detail_json
  )
  VALUES (
    CASE WHEN p_is_active THEN 'member_reactivated' ELSE 'member_deactivated' END,
    v_actor,
    v_target_user,
    p_org_id,
    jsonb_build_object('member_id', p_member_id, 'is_active', p_is_active)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.admin_deactivate_member(uuid, uuid, boolean)
  TO app_user, app_admin, authenticator;

-- 7) 비밀번호 변경 시 must_change_password 해제 헬퍼
CREATE OR REPLACE FUNCTION app.clear_must_change_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
BEGIN
  UPDATE app.users
  SET must_change_password = false,
      updated_at = now()
  WHERE id = app.current_user_id();
END;
$$;

GRANT EXECUTE ON FUNCTION app.clear_must_change_password() TO app_user, app_admin, authenticator;
