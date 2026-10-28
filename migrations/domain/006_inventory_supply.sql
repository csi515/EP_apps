-- 재고·발주 누락 DDL (database.types 기준)

CREATE TABLE IF NOT EXISTS core.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  category text NOT NULL DEFAULT '',
  quantity numeric(14, 3) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'ea',
  unit_cost numeric(14, 2) NOT NULL DEFAULT 0,
  location text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_items_org_idx
  ON core.inventory_items (organization_id, is_active);

CREATE TABLE IF NOT EXISTS core.supply_restock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL DEFAULT '',
  current_quantity numeric(14, 3) NOT NULL DEFAULT 0,
  safety_threshold numeric(14, 3) NOT NULL DEFAULT 0,
  optimal_order_quantity numeric(14, 3) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'ea',
  unit_cost numeric(14, 2) NOT NULL DEFAULT 0,
  vendor_name text NOT NULL DEFAULT '',
  vendor_contact text,
  status text NOT NULL DEFAULT 'ok',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supply_restock_items_org_idx
  ON core.supply_restock_items (organization_id, status);

CREATE TABLE IF NOT EXISTS core.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  vendor_name text NOT NULL,
  vendor_contact text,
  order_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  memo text,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_org_po_uidx
  ON core.purchase_orders (organization_id, po_number);

-- RLS (004 루프 이후 추가 테이블용)
ALTER TABLE core.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON core.inventory_items;
CREATE POLICY tenant_isolation ON core.inventory_items
  FOR ALL TO app_user
  USING (app.is_org_member(organization_id))
  WITH CHECK (app.is_org_member(organization_id));

ALTER TABLE core.supply_restock_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON core.supply_restock_items;
CREATE POLICY tenant_isolation ON core.supply_restock_items
  FOR ALL TO app_user
  USING (app.is_org_member(organization_id))
  WITH CHECK (app.is_org_member(organization_id));

ALTER TABLE core.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON core.purchase_orders;
CREATE POLICY tenant_isolation ON core.purchase_orders
  FOR ALL TO app_user
  USING (app.is_org_member(organization_id))
  WITH CHECK (app.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.inventory_items TO app_user, authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.supply_restock_items TO app_user, authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.purchase_orders TO app_user, authenticator;
