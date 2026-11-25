-- 공용 자원: can_manage_resources + 카탈로그/예약 RLS + reservation/bookable RPC SoT

CREATE OR REPLACE FUNCTION core.can_manage_resources(p_org uuid)
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
        OR COALESCE((r.permissions->>'resources:manage')::boolean, false)
        OR COALESCE((r.permissions->>'resources_manage')::boolean, false)
        OR COALESCE((m.feature_permissions->>'resources:manage')::boolean, false)
        OR COALESCE((m.feature_permissions->>'resources_manage')::boolean, false)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION core.can_manage_resources(uuid)
  TO app_user, app_admin, authenticator;

COMMENT ON FUNCTION core.can_manage_resources(uuid) IS
  '공용자원 담당(resources:manage / resources_manage) 또는 org admin/owner';

-- ---------------------------------------------------------------------------
-- bookable_resources
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.bookable_resources;
DROP POLICY IF EXISTS bookable_resources_select ON core.bookable_resources;
DROP POLICY IF EXISTS bookable_resources_insert ON core.bookable_resources;
DROP POLICY IF EXISTS bookable_resources_update ON core.bookable_resources;
DROP POLICY IF EXISTS bookable_resources_delete ON core.bookable_resources;

CREATE POLICY bookable_resources_select ON core.bookable_resources
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY bookable_resources_insert ON core.bookable_resources
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_resources(organization_id)
  );

CREATE POLICY bookable_resources_update ON core.bookable_resources
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_resources(organization_id)
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_resources(organization_id)
  );

CREATE POLICY bookable_resources_delete ON core.bookable_resources
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_resources(organization_id)
  );

-- ---------------------------------------------------------------------------
-- resource_types (카탈로그)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.resource_types;
DROP POLICY IF EXISTS resource_types_select ON core.resource_types;
DROP POLICY IF EXISTS resource_types_insert ON core.resource_types;
DROP POLICY IF EXISTS resource_types_update ON core.resource_types;
DROP POLICY IF EXISTS resource_types_delete ON core.resource_types;

CREATE POLICY resource_types_select ON core.resource_types
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY resource_types_insert ON core.resource_types
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_resources(organization_id)
  );

CREATE POLICY resource_types_update ON core.resource_types
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_resources(organization_id)
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_resources(organization_id)
  );

CREATE POLICY resource_types_delete ON core.resource_types
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_resources(organization_id)
  );

-- ---------------------------------------------------------------------------
-- room_reservations
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON core.room_reservations;
DROP POLICY IF EXISTS room_reservations_select ON core.room_reservations;
DROP POLICY IF EXISTS room_reservations_insert ON core.room_reservations;
DROP POLICY IF EXISTS room_reservations_update ON core.room_reservations;
DROP POLICY IF EXISTS room_reservations_delete ON core.room_reservations;

CREATE POLICY room_reservations_select ON core.room_reservations
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY room_reservations_insert ON core.room_reservations
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND requested_by = app.current_user_id()
  );

CREATE POLICY room_reservations_update ON core.room_reservations
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      requested_by = app.current_user_id()
      OR core.can_manage_resources(organization_id)
    )
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND (
      requested_by = app.current_user_id()
      OR core.can_manage_resources(organization_id)
    )
  );

CREATE POLICY room_reservations_delete ON core.room_reservations
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND (
      requested_by = app.current_user_id()
      OR core.can_manage_resources(organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Bookable resource RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.list_org_bookable_resources(
  p_org_id uuid,
  p_kind text DEFAULT NULL
)
RETURNS SETOF core.bookable_resources
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
BEGIN
  IF NOT app.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT *
  FROM core.bookable_resources br
  WHERE br.organization_id = p_org_id
    AND br.is_active = true
    AND (p_kind IS NULL OR br.kind = p_kind)
  ORDER BY br.kind, br.name;
END;
$$;

CREATE OR REPLACE FUNCTION core.upsert_bookable_resource(
  p_org_id uuid,
  p_kind text,
  p_name text,
  p_capacity int DEFAULT 1,
  p_open_time time DEFAULT '09:00',
  p_close_time time DEFAULT '22:00',
  p_id uuid DEFAULT NULL,
  p_memo text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT app.is_org_member(p_org_id) OR NOT core.can_manage_resources(p_org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE core.bookable_resources
    SET
      kind = p_kind,
      name = btrim(p_name),
      capacity = GREATEST(COALESCE(p_capacity, 1), 1),
      open_time = COALESCE(p_open_time, open_time),
      close_time = COALESCE(p_close_time, close_time),
      memo = NULLIF(btrim(COALESCE(p_memo, '')), ''),
      updated_at = now()
    WHERE id = p_id
      AND organization_id = p_org_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'not found';
    END IF;
    RETURN v_id;
  END IF;

  INSERT INTO core.bookable_resources (
    organization_id, kind, name, capacity, open_time, close_time, memo
  ) VALUES (
    p_org_id,
    p_kind,
    btrim(p_name),
    GREATEST(COALESCE(p_capacity, 1), 1),
    COALESCE(p_open_time, '09:00'::time),
    COALESCE(p_close_time, '22:00'::time),
    NULLIF(btrim(COALESCE(p_memo, '')), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION core.set_bookable_resource_active(
  p_org_id uuid,
  p_id uuid,
  p_active boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
BEGIN
  IF NOT app.is_org_member(p_org_id) OR NOT core.can_manage_resources(p_org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE core.bookable_resources
  SET is_active = p_active, updated_at = now()
  WHERE id = p_id AND organization_id = p_org_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION core.upsert_practice_room(
  p_org_id uuid,
  p_name text,
  p_capacity int DEFAULT 1,
  p_open_time time DEFAULT '09:00',
  p_close_time time DEFAULT '22:00',
  p_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT core.upsert_bookable_resource(
    p_org_id,
    'practice_room',
    p_name,
    p_capacity,
    p_open_time,
    p_close_time,
    p_id,
    NULL
  );
$$;

-- ---------------------------------------------------------------------------
-- Room reservation RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.list_org_room_reservations(
  p_org_id uuid,
  p_room_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  room_id uuid,
  customer_id uuid,
  requested_by uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  status core.room_reservation_status,
  memo text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz,
  requester_name text,
  resource_name text,
  resource_kind text,
  customer_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
BEGIN
  IF NOT app.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT
    rr.id,
    rr.organization_id,
    rr.room_id,
    rr.customer_id,
    rr.requested_by,
    rr.starts_at,
    rr.ends_at,
    rr.status,
    rr.memo,
    rr.reviewed_by,
    rr.reviewed_at,
    rr.created_at,
    NULL::text AS requester_name,
    br.name AS resource_name,
    br.kind AS resource_kind,
    NULL::text AS customer_name
  FROM core.room_reservations rr
  LEFT JOIN core.bookable_resources br ON br.id = rr.room_id
  WHERE rr.organization_id = p_org_id
    AND (p_room_id IS NULL OR rr.room_id = p_room_id)
    AND (p_from IS NULL OR rr.starts_at >= p_from)
    AND (p_to IS NULL OR rr.starts_at <= p_to)
  ORDER BY rr.starts_at ASC
  LIMIT GREATEST(COALESCE(p_limit, 200), 1);
END;
$$;

CREATE OR REPLACE FUNCTION core.request_room_reservation(
  p_org_id uuid,
  p_room_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_memo text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_uid uuid := app.current_user_id();
  v_id uuid;
  v_customer uuid;
BEGIN
  IF NOT app.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- customers 테이블이 있는 환경에서만 연결. 없으면 customer_id NULL로 pending 신청.
  BEGIN
    EXECUTE
      'SELECT id FROM core.customers WHERE organization_id = $1 AND user_id = $2 LIMIT 1'
      INTO v_customer
      USING p_org_id, v_uid;
  EXCEPTION
    WHEN undefined_table THEN
      v_customer := NULL;
  END;

  INSERT INTO core.room_reservations (
    organization_id, room_id, customer_id, requested_by,
    starts_at, ends_at, status, memo
  ) VALUES (
    p_org_id, p_room_id, v_customer, v_uid,
    p_starts_at, p_ends_at, 'pending',
    NULLIF(btrim(COALESCE(p_memo, '')), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION core.request_member_room_reservation(
  p_org_id uuid,
  p_room_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_memo text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_uid uuid := app.current_user_id();
  v_id uuid;
  v_status core.room_reservation_status := 'approved';
  v_meta jsonb;
BEGIN
  IF NOT app.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT metadata INTO v_meta
  FROM core.bookable_resources
  WHERE id = p_room_id AND organization_id = p_org_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;

  IF COALESCE((v_meta->>'require_approval')::boolean, false) THEN
    v_status := 'pending';
  END IF;

  INSERT INTO core.room_reservations (
    organization_id, room_id, customer_id, requested_by,
    starts_at, ends_at, status, memo
  ) VALUES (
    p_org_id, p_room_id, NULL, v_uid,
    p_starts_at, p_ends_at, v_status,
    NULLIF(btrim(COALESCE(p_memo, '')), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION core.create_staff_room_reservation(
  p_org_id uuid,
  p_room_id uuid,
  p_customer_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_memo text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_uid uuid := app.current_user_id();
  v_id uuid;
BEGIN
  IF NOT app.is_org_member(p_org_id) OR NOT core.can_manage_resources(p_org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO core.room_reservations (
    organization_id, room_id, customer_id, requested_by,
    starts_at, ends_at, status, memo
  ) VALUES (
    p_org_id, p_room_id, p_customer_id, v_uid,
    p_starts_at, p_ends_at, 'approved',
    NULLIF(btrim(COALESCE(p_memo, '')), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION core.cancel_my_room_reservation(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_row core.room_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM core.room_reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;
  IF NOT app.is_org_member(v_row.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_row.requested_by IS DISTINCT FROM app.current_user_id()
     AND NOT core.can_manage_resources(v_row.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE core.room_reservations
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION core.review_room_reservation(
  p_reservation_id uuid,
  p_approve boolean,
  p_memo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_row core.room_reservations%ROWTYPE;
  v_uid uuid := app.current_user_id();
BEGIN
  SELECT * INTO v_row
  FROM core.room_reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;
  IF NOT core.can_manage_resources(v_row.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE core.room_reservations
  SET
    status = CASE WHEN p_approve THEN 'approved'::core.room_reservation_status
                  ELSE 'rejected'::core.room_reservation_status END,
    reviewed_by = v_uid,
    reviewed_at = now(),
    memo = COALESCE(NULLIF(btrim(COALESCE(p_memo, '')), ''), memo),
    updated_at = now()
  WHERE id = p_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.list_org_bookable_resources(uuid, text)
  TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.upsert_bookable_resource(uuid, text, text, int, time, time, uuid, text)
  TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.set_bookable_resource_active(uuid, uuid, boolean)
  TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.upsert_practice_room(uuid, text, int, time, time, uuid)
  TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.list_org_room_reservations(uuid, uuid, timestamptz, timestamptz, int)
  TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.request_room_reservation(uuid, uuid, timestamptz, timestamptz, text)
  TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.request_member_room_reservation(uuid, uuid, timestamptz, timestamptz, text)
  TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.create_staff_room_reservation(uuid, uuid, uuid, timestamptz, timestamptz, text)
  TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.cancel_my_room_reservation(uuid)
  TO app_user, app_admin, authenticator;
GRANT EXECUTE ON FUNCTION core.review_room_reservation(uuid, boolean, text)
  TO app_user, app_admin, authenticator;

-- PostgREST: NOTIFY pgrst, 'reload schema';
