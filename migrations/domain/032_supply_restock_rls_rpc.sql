-- 소모품 안전재고: can_manage + RLS 강화 (SELECT member / WRITE manage)

CREATE OR REPLACE FUNCTION core.can_manage_supply_restock(p_org uuid)
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
        OR COALESCE((r.permissions->>'supply_restock:manage')::boolean, false)
        OR COALESCE((m.feature_permissions->>'supply_restock:manage')::boolean, false)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION core.can_manage_supply_restock(uuid)
  TO app_user, app_admin, authenticator;

COMMENT ON FUNCTION core.can_manage_supply_restock(uuid) IS
  '소모품 안전재고 담당(supply_restock:manage) 또는 org admin/owner';

-- inventory_items
DROP POLICY IF EXISTS tenant_isolation ON core.inventory_items;
DROP POLICY IF EXISTS inventory_items_select ON core.inventory_items;
DROP POLICY IF EXISTS inventory_items_insert ON core.inventory_items;
DROP POLICY IF EXISTS inventory_items_update ON core.inventory_items;
DROP POLICY IF EXISTS inventory_items_delete ON core.inventory_items;

CREATE POLICY inventory_items_select ON core.inventory_items
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY inventory_items_insert ON core.inventory_items
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  );

CREATE POLICY inventory_items_update ON core.inventory_items
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  );

CREATE POLICY inventory_items_delete ON core.inventory_items
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  );

-- supply_restock_items
DROP POLICY IF EXISTS tenant_isolation ON core.supply_restock_items;
DROP POLICY IF EXISTS supply_restock_items_select ON core.supply_restock_items;
DROP POLICY IF EXISTS supply_restock_items_insert ON core.supply_restock_items;
DROP POLICY IF EXISTS supply_restock_items_update ON core.supply_restock_items;
DROP POLICY IF EXISTS supply_restock_items_delete ON core.supply_restock_items;

CREATE POLICY supply_restock_items_select ON core.supply_restock_items
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY supply_restock_items_insert ON core.supply_restock_items
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  );

CREATE POLICY supply_restock_items_update ON core.supply_restock_items
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  );

CREATE POLICY supply_restock_items_delete ON core.supply_restock_items
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  );

-- purchase_orders
DROP POLICY IF EXISTS tenant_isolation ON core.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_select ON core.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_insert ON core.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_update ON core.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_delete ON core.purchase_orders;

CREATE POLICY purchase_orders_select ON core.purchase_orders
  FOR SELECT TO app_user
  USING (app.is_org_member(organization_id));

CREATE POLICY purchase_orders_insert ON core.purchase_orders
  FOR INSERT TO app_user
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  );

CREATE POLICY purchase_orders_update ON core.purchase_orders
  FOR UPDATE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  )
  WITH CHECK (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  );

CREATE POLICY purchase_orders_delete ON core.purchase_orders
  FOR DELETE TO app_user
  USING (
    app.is_org_member(organization_id)
    AND core.can_manage_supply_restock(organization_id)
  );

-- PostgREST: NOTIFY pgrst, 'reload schema';
