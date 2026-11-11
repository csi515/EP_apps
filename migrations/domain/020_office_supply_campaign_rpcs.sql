-- 사무용품 월별 취합: 캠페인/신청라인/부서집계 RPC

CREATE OR REPLACE FUNCTION core.can_manage_office_supply_request(p_org uuid)
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
        OR COALESCE((r.permissions->>'office_supply_request:manage')::boolean, false)
        OR COALESCE((m.feature_permissions->>'office_supply_request:manage')::boolean, false)
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.office_supply_campaign_is_writable(p_campaign jsonb)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(p_campaign->>'status', '') = 'open'
    AND NULLIF(p_campaign->>'deadline_at', '') IS NOT NULL
    AND now() < (p_campaign->>'deadline_at')::timestamptz;
$$;

CREATE OR REPLACE FUNCTION core.resolve_member_primary_department(
  p_organization_id uuid,
  p_member_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, app, public
AS $$
  SELECT COALESCE(
    (
      SELECT dm.department_id
      FROM core.department_members dm
      WHERE dm.organization_id = p_organization_id
        AND dm.member_id = p_member_id
      ORDER BY dm.created_at ASC
      LIMIT 1
    ),
    (
      SELECT st.department_id
      FROM core.organization_members m
      JOIN core.staff st ON st.id = m.staff_id
      WHERE m.id = p_member_id
        AND m.organization_id = p_organization_id
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION core.upsert_office_supply_campaign(
  p_organization_id uuid,
  p_year_month text,
  p_deadline_at timestamptz,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_row core.office_supply_campaigns%ROWTYPE;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT core.can_manage_office_supply_request(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_year_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'invalid year_month';
  END IF;
  IF p_deadline_at IS NULL THEN
    RAISE EXCEPTION 'deadline required';
  END IF;

  INSERT INTO core.office_supply_campaigns AS c (
    organization_id, year_month, deadline_at, status, note, updated_at
  ) VALUES (
    p_organization_id, p_year_month, p_deadline_at, 'open', NULLIF(btrim(COALESCE(p_note, '')), ''), now()
  )
  ON CONFLICT (organization_id, year_month) DO UPDATE SET
    deadline_at = EXCLUDED.deadline_at,
    note = EXCLUDED.note,
    -- 관리자가 마감을 다시 열 수 있도록 상태/closed_at 유지하되, deadline만 갱신
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION core.close_office_supply_campaign(
  p_organization_id uuid,
  p_campaign_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_row core.office_supply_campaigns%ROWTYPE;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT core.can_manage_office_supply_request(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE core.office_supply_campaigns
  SET status = 'closed',
      closed_at = COALESCE(closed_at, now()),
      updated_at = now()
  WHERE id = p_campaign_id
    AND organization_id = p_organization_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign not found';
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION core.reopen_office_supply_campaign(
  p_organization_id uuid,
  p_campaign_id uuid,
  p_deadline_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_row core.office_supply_campaigns%ROWTYPE;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT core.can_manage_office_supply_request(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE core.office_supply_campaigns
  SET status = 'open',
      closed_at = NULL,
      deadline_at = COALESCE(p_deadline_at, deadline_at),
      updated_at = now()
  WHERE id = p_campaign_id
    AND organization_id = p_organization_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign not found';
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION core.upsert_office_supply_request_lines(
  p_organization_id uuid,
  p_campaign_id uuid,
  p_lines jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_campaign core.office_supply_campaigns%ROWTYPE;
  v_member_id uuid;
  v_dept_id uuid;
  v_line jsonb;
  v_item_id uuid;
  v_qty numeric;
  v_active boolean;
  v_kept uuid[] := ARRAY[]::uuid[];
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_campaign
  FROM core.office_supply_campaigns
  WHERE id = p_campaign_id
    AND organization_id = p_organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign not found';
  END IF;
  IF NOT core.office_supply_campaign_is_writable(to_jsonb(v_campaign)) THEN
    RAISE EXCEPTION 'campaign not writable';
  END IF;

  SELECT id INTO v_member_id
  FROM core.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = app.current_user_id()
    AND deleted_at IS NULL
    AND is_active = true
  LIMIT 1;
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  v_dept_id := core.resolve_member_primary_department(p_organization_id, v_member_id);

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'invalid lines';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_item_id := NULLIF(v_line->>'catalog_item_id', '')::uuid;
    v_qty := COALESCE((v_line->>'quantity')::numeric, 0);
    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'catalog_item_id required';
    END IF;
    IF v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT is_active INTO v_active
    FROM core.office_supply_catalog_items
    WHERE id = v_item_id
      AND organization_id = p_organization_id;
    IF NOT FOUND OR v_active IS NOT TRUE THEN
      RAISE EXCEPTION 'catalog item not available';
    END IF;

    INSERT INTO core.office_supply_request_lines AS l (
      organization_id, campaign_id, member_id, department_id, catalog_item_id, quantity, updated_at
    ) VALUES (
      p_organization_id, p_campaign_id, v_member_id, v_dept_id, v_item_id, v_qty, now()
    )
    ON CONFLICT (campaign_id, member_id, catalog_item_id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      department_id = EXCLUDED.department_id,
      updated_at = now();

    v_kept := array_append(v_kept, v_item_id);
  END LOOP;

  DELETE FROM core.office_supply_request_lines
  WHERE campaign_id = p_campaign_id
    AND member_id = v_member_id
    AND (
      cardinality(v_kept) = 0
      OR catalog_item_id <> ALL (v_kept)
    );

  RETURN jsonb_build_object('ok', true, 'line_count', cardinality(v_kept));
END;
$$;

CREATE OR REPLACE FUNCTION core.list_office_supply_dept_aggregate(
  p_organization_id uuid,
  p_campaign_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, app, public
AS $$
DECLARE
  v_campaign core.office_supply_campaigns%ROWTYPE;
  v_by_dept jsonb;
  v_by_item jsonb;
  v_grand numeric := 0;
BEGIN
  IF NOT app.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT core.can_manage_office_supply_request(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_campaign
  FROM core.office_supply_campaigns
  WHERE id = p_campaign_id
    AND organization_id = p_organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign not found';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.department_name, x.item_name), '[]'::jsonb)
  INTO v_by_dept
  FROM (
    SELECT
      l.department_id,
      COALESCE(NULLIF(btrim(d.name), ''), '(부서 미지정)') AS department_name,
      l.catalog_item_id,
      c.name AS item_name,
      c.unit,
      c.estimated_unit_price,
      sum(l.quantity) AS total_quantity,
      sum(l.quantity) * c.estimated_unit_price AS estimated_total
    FROM core.office_supply_request_lines l
    JOIN core.office_supply_catalog_items c ON c.id = l.catalog_item_id
    LEFT JOIN core.departments d ON d.id = l.department_id
    WHERE l.organization_id = p_organization_id
      AND l.campaign_id = p_campaign_id
    GROUP BY l.department_id, d.name, l.catalog_item_id, c.name, c.unit, c.estimated_unit_price
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(y) ORDER BY y.item_name), '[]'::jsonb),
         COALESCE(sum(y.estimated_total), 0)
  INTO v_by_item, v_grand
  FROM (
    SELECT
      l.catalog_item_id,
      c.name AS item_name,
      c.unit,
      c.estimated_unit_price,
      sum(l.quantity) AS total_quantity,
      sum(l.quantity) * c.estimated_unit_price AS estimated_total
    FROM core.office_supply_request_lines l
    JOIN core.office_supply_catalog_items c ON c.id = l.catalog_item_id
    WHERE l.organization_id = p_organization_id
      AND l.campaign_id = p_campaign_id
    GROUP BY l.catalog_item_id, c.name, c.unit, c.estimated_unit_price
  ) y;

  RETURN jsonb_build_object(
    'campaign', jsonb_build_object(
      'id', v_campaign.id,
      'year_month', v_campaign.year_month,
      'deadline_at', v_campaign.deadline_at,
      'status', v_campaign.status,
      'closed_at', v_campaign.closed_at,
      'note', v_campaign.note
    ),
    'by_department', v_by_dept,
    'by_item', v_by_item,
    'grand_total_estimate', v_grand
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.can_manage_office_supply_request(uuid) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.office_supply_campaign_is_writable(jsonb) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.resolve_member_primary_department(uuid, uuid) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.upsert_office_supply_campaign(uuid, text, timestamptz, text) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.close_office_supply_campaign(uuid, uuid) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.reopen_office_supply_campaign(uuid, uuid, timestamptz) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.upsert_office_supply_request_lines(uuid, uuid, jsonb) TO app_user, authenticator;
GRANT EXECUTE ON FUNCTION core.list_office_supply_dept_aggregate(uuid, uuid) TO app_user, authenticator;
