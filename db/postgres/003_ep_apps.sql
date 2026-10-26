-- EP_apps 업무 테이블. 세션 사용자는 app.current_user_id() 로 판별한다.
-- 로그인 사용자 참조는 app.users 이다.

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  CREATE TYPE core.room_reservation_status AS ENUM (
    'pending', 'approved', 'cancelled', 'rejected', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE core.waitlist_status AS ENUM (
    'waiting', 'notified', 'assigned', 'cancelled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_org_id ON core.staff(organization_id);

CREATE TABLE IF NOT EXISTS core.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  category_id       UUID,
  product_code      TEXT,
  price             NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  cost              NUMERIC(12, 2) CHECK (cost IS NULL OR cost >= 0),
  image_url         TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.products IS '소매 상품 마스터. organization_id로 사업장 분리. category_id는 향후 카테고리 테이블 연결용(현재 FK 없음).';

COMMENT ON COLUMN core.products.category_id IS 'nullable — 상품 카테고리 테이블 미도입 상태의';

COMMENT ON COLUMN core.products.product_code IS '사업장 내 상품 코드(선택)';

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_product_code
  ON core.products (organization_id, product_code)
  WHERE product_code IS NOT NULL AND btrim(product_code) <> '';

CREATE INDEX IF NOT EXISTS idx_products_org_active
  ON core.products (organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_products_org_name
  ON core.products (organization_id, name);

CREATE TABLE IF NOT EXISTS core.product_variants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES core.products(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  sku               TEXT,
  price             NUMERIC(12, 2) CHECK (price IS NULL OR price >= 0),
  cost              NUMERIC(12, 2) CHECK (cost IS NULL OR cost >= 0),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.product_variants IS '상품 옵션/변형. 없으면 상품(products) 단위로만 운영 가능. 판매·재고는 variant 단위로 확장 예정.';

COMMENT ON COLUMN core.product_variants.name IS '옵션 라벨 (예: 빨강 / L)';

COMMENT ON COLUMN core.product_variants.price IS 'nullable — null이면 상위 product.price 사용';

COMMENT ON COLUMN core.product_variants.cost IS 'nullable — null이면 상위 product.cost 사용';

CREATE INDEX IF NOT EXISTS idx_product_variants_product
  ON core.product_variants (product_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_product_sku
  ON core.product_variants (product_id, sku)
  WHERE sku IS NOT NULL AND btrim(sku) <> '';

CREATE TABLE IF NOT EXISTS core.product_categories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_categories_org_name UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_org_active
  ON core.product_categories (organization_id, is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE core.products
      ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES core.product_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS core.inventory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES core.products(id) ON DELETE CASCADE,
  variant_id        UUID REFERENCES core.product_variants(id) ON DELETE CASCADE,
  quantity          NUMERIC(14, 3) NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_product_or_variant_chk
    CHECK (product_id IS NOT NULL OR variant_id IS NOT NULL)
);

COMMENT ON TABLE core.inventory IS '현재 재고 잔량. organization_id로 사업장 분리. 변경은 stock_movements로 추적.';

COMMENT ON COLUMN core.inventory.product_id IS '옵션 없는 상품 재고 — variant_id NULL';

COMMENT ON COLUMN core.inventory.variant_id IS '옵션 단위 재고 — 있으면 variant 기준';

COMMENT ON COLUMN core.inventory.quantity IS '현재 수량(잔량). 직접 덮어쓰기보다 movement 반영을 권장.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_product_no_variant
  ON core.inventory (organization_id, product_id)
  WHERE variant_id IS NULL AND product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_variant
  ON core.inventory (organization_id, variant_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_org
  ON core.inventory (organization_id);

CREATE INDEX IF NOT EXISTS idx_inventory_org_product
  ON core.inventory (organization_id, product_id)
  WHERE product_id IS NOT NULL;

DO $$ BEGIN
  CREATE TYPE core.stock_movement_type AS ENUM (
    'inbound',
    'sale',
    'return',
    'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE core.stock_movement_type IS '재고 변동 유형. inbound는 입고, sale은 판매 출고.';

CREATE TABLE IF NOT EXISTS core.stock_movements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES core.products(id) ON DELETE SET NULL,
  variant_id        UUID REFERENCES core.product_variants(id) ON DELETE SET NULL,
  movement_type     core.stock_movement_type NOT NULL,
  quantity          NUMERIC(14, 3) NOT NULL,
  reference_type    TEXT,
  reference_id      UUID,
  reason            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_product_or_variant_chk
    CHECK (product_id IS NOT NULL OR variant_id IS NOT NULL),
  CONSTRAINT stock_movements_quantity_nonzero_chk
    CHECK (quantity <> 0)
);

COMMENT ON TABLE core.stock_movements IS '재고 이동 이력(append 권장). quantity는 부호 있는 증감(입고+, 판매- 등).';

COMMENT ON COLUMN core.stock_movements.movement_type IS 'inbound|sale|return|adjustment';

COMMENT ON COLUMN core.stock_movements.quantity IS '증감량(부호 포함). 이력 추적용 — 잔량은 inventory.quantity.';

COMMENT ON COLUMN core.stock_movements.reference_type IS '연관 도메인 키(예: sale, purchase_order) — 선택';

COMMENT ON COLUMN core.stock_movements.reference_id IS '연관 레코드 id — 선택';

CREATE INDEX IF NOT EXISTS idx_stock_movements_org_created
  ON core.stock_movements (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_org_product
  ON core.stock_movements (organization_id, product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_org_variant
  ON core.stock_movements (organization_id, variant_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
  ON core.stock_movements (organization_id, reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

COMMENT ON TABLE core.products IS
  'Core 상품 마스터. organization_id 멀티테넌트. 업종별 확장(교재 ISBN 등)은 Module 측.';

COMMENT ON COLUMN core.products.category_id IS
  'core.product_categories 참조(nullable). 동일 organization_id만 허용(트리거).';

COMMENT ON COLUMN core.products.product_code IS
  '사업장 내 상품 코드(선택). (organization_id, product_code) 유일.';

COMMENT ON TABLE core.product_variants IS
  'Core 상품 옵션/변형. 없으면 products 단위로 재고·판매 가능.';

COMMENT ON COLUMN core.product_variants.price IS
  'nullable — null이면 상위 products.price 사용(앱 해석).';

COMMENT ON COLUMN core.product_variants.cost IS
  'nullable — null이면 상위 products.cost 사용(앱 해석).';

COMMENT ON TABLE core.inventory IS
  'Core 현재 재고 잔량. 변경은 stock_movements로 추적. 상품단위(variant NULL) 또는 옵션단위 유일.';

COMMENT ON COLUMN core.inventory.quantity IS
  '현재 잔량. movement 반영으로 갱신(직접 덮어쓰기 비권장).';

COMMENT ON TABLE core.stock_movements IS
  'Core 재고 변동 이력(append). quantity는 부호 있는 증감. 판매/반품은 reference로 추적.';

COMMENT ON COLUMN core.stock_movements.reference_type IS
  '연관 도메인: sale | sale_return | (기타 입고/조정 키).';

COMMENT ON COLUMN core.stock_movements.reference_id IS
  '연관 레코드 id (sale.id 또는 sale_returns.id 등).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_product_name
  ON core.product_variants (product_id, lower(btrim(name)));

ALTER TABLE core.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_sale_sign_ref_chk;

ALTER TABLE core.stock_movements
  ADD CONSTRAINT stock_movements_sale_sign_ref_chk
  CHECK (
    movement_type <> 'sale'
    OR (
      quantity < 0
      AND reference_type = 'sale'
      AND reference_id IS NOT NULL
    )
  );

ALTER TABLE core.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_return_sign_ref_chk;

ALTER TABLE core.stock_movements
  ADD CONSTRAINT stock_movements_return_sign_ref_chk
  CHECK (
    movement_type <> 'return'
    OR (
      quantity > 0
      AND reference_type = 'sale_return'
      AND reference_id IS NOT NULL
    )
  );

ALTER TABLE core.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_inbound_sign_chk;

ALTER TABLE core.stock_movements
  ADD CONSTRAINT stock_movements_inbound_sign_chk
  CHECK (
    movement_type <> 'inbound'
    OR quantity > 0
  );

ALTER TABLE core.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_sale_sign_ref_chk;

ALTER TABLE core.stock_movements
  ADD CONSTRAINT stock_movements_sale_sign_ref_chk
  CHECK (
    movement_type <> 'sale'
    OR (
      quantity < 0
      AND reference_type IN ('sale', 'textbook_sale')
      AND reference_id IS NOT NULL
    )
  );

ALTER TABLE core.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_return_sign_ref_chk;

ALTER TABLE core.stock_movements
  ADD CONSTRAINT stock_movements_return_sign_ref_chk
  CHECK (
    movement_type <> 'return'
    OR (
      quantity > 0
      AND reference_type IN ('sale_return', 'textbook_sale')
      AND reference_id IS NOT NULL
    )
  );

ALTER TABLE core.inventory
  DROP CONSTRAINT IF EXISTS inventory_quantity_nonneg_chk;

ALTER TABLE core.inventory
  ADD CONSTRAINT inventory_quantity_nonneg_chk CHECK (quantity >= 0);

CREATE TABLE IF NOT EXISTS core.bookable_resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL
                    CHECK (char_length(kind) BETWEEN 2 AND 40 AND kind ~ '^[a-z][a-z0-9_]*$'),
  name            TEXT NOT NULL,
  capacity        INT NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  open_time       TIME NOT NULL DEFAULT '09:00',
  close_time      TIME NOT NULL DEFAULT '22:00',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  memo            TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, kind, name)
);

CREATE TABLE IF NOT EXISTS core.room_reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  room_id         UUID NOT NULL REFERENCES core.bookable_resources(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL,
  requested_by    UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          core.room_reservation_status NOT NULL DEFAULT 'pending',
  memo            TEXT,
  reviewed_by     UUID REFERENCES app.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT room_reservations_time_check CHECK (ends_at > starts_at),
    CONSTRAINT room_reservations_same_day CHECK (
    (starts_at AT TIME ZONE 'Asia/Seoul')::date
      = (ends_at AT TIME ZONE 'Asia/Seoul')::date
  )
);

CREATE INDEX IF NOT EXISTS idx_room_reservations_org_time
  ON core.room_reservations(organization_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_room_reservations_customer
  ON core.room_reservations(customer_id, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_reservations_pending
  ON core.room_reservations(organization_id, status)
  WHERE status = 'pending';

ALTER TABLE core.room_reservations
  DROP CONSTRAINT IF EXISTS room_reservations_no_overlap;

ALTER TABLE core.room_reservations
  ADD CONSTRAINT room_reservations_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'approved'));

COMMENT ON TABLE core.room_reservations IS
  '연습실 예약. pending/approved 구간은 EXCLUDE로 중복 차단.';

COMMENT ON TABLE core.room_reservations IS
  '연습실 예약 단일 원장. 레거시 schedules(kind=practice_room)는 20260907160000에서 이관됨.';

CREATE INDEX IF NOT EXISTS idx_bookable_resources_org_kind
  ON core.bookable_resources (organization_id, kind)
  WHERE is_active;

COMMENT ON TABLE core.bookable_resources IS
  '업종 공통 예약 자원. kind는 모듈이 정하고 Core는 분기하지 않는다.';

ALTER TABLE core.room_reservations
  DROP CONSTRAINT IF EXISTS room_reservations_room_id_fkey;

ALTER TABLE core.room_reservations
  ADD CONSTRAINT room_reservations_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES core.bookable_resources(id) ON DELETE CASCADE;

COMMENT ON TABLE core.room_reservations IS
  '공통 자원 예약 원장. room_id = bookable_resources.id. pending/approved 구간은 EXCLUDE로 중복 차단.';

COMMENT ON COLUMN core.room_reservations.room_id IS
  'bookable_resources.id. 컬럼명은 호환을 위해 유지한다.';

CREATE TABLE core.waitlist_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  target_type       TEXT NOT NULL,
  target_id         TEXT NOT NULL,
  customer_id       UUID NOT NULL,
  schedule_id       UUID,
  requested_time    TIMESTAMPTZ,
  status            core.waitlist_status NOT NULL DEFAULT 'waiting',
  position          INT NOT NULL,
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at       TIMESTAMPTZ,
  assigned_at       TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  expired_at        TIMESTAMPTZ,
  booking_id        UUID,
  reservation_id    UUID REFERENCES core.room_reservations(id) ON DELETE SET NULL,
  notification_id   UUID,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_target_time_check CHECK (
    schedule_id IS NOT NULL OR requested_time IS NOT NULL
  ),
  CONSTRAINT waitlist_position_check CHECK (position >= 1),
  CONSTRAINT waitlist_target_nonempty_check CHECK (
    length(btrim(target_type)) > 0 AND length(btrim(target_id)) > 0
  )
);

COMMENT ON TABLE core.waitlist_entries IS
  '공통 대기열. Booking/Resource Reservation FK는 선택 연결이다.';

COMMENT ON COLUMN core.waitlist_entries.booking_id IS
  '선택 연결. 업종 예약 원장이 다를 수 있어 FK 없음.';

COMMENT ON COLUMN core.waitlist_entries.notification_id IS
  'Notification Capability 연결. SMS 발송은 하지 않는다.';

CREATE INDEX idx_waitlist_org_target_status
  ON core.waitlist_entries (organization_id, target_type, target_id, status, position);

CREATE INDEX idx_waitlist_org_customer
  ON core.waitlist_entries (organization_id, customer_id, joined_at DESC);

CREATE UNIQUE INDEX uq_waitlist_open_position
  ON core.waitlist_entries (organization_id, target_type, target_id, position)
  WHERE status IN ('waiting', 'notified');

CREATE UNIQUE INDEX uq_waitlist_open_customer
  ON core.waitlist_entries (organization_id, target_type, target_id, customer_id)
  WHERE status IN ('waiting', 'notified');

CREATE TABLE IF NOT EXISTS core.facility_incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  incident_title text NOT NULL,
  incident_date timestamptz NOT NULL DEFAULT now(),
  incident_type text NOT NULL DEFAULT 'injury',
  severity text NOT NULL DEFAULT 'minor',
  location_in_facility text NOT NULL,
  involved_person_name text NOT NULL,
  involved_person_role text NOT NULL DEFAULT 'student',
  witness_name text,
  supervisor_name text,
  description text NOT NULL,
  injury_details text,
  emergency_action_taken text,
  guardian_notified_at timestamptz,
  hospital_transported boolean NOT NULL DEFAULT false,
  insurance_claimed boolean NOT NULL DEFAULT false,
  insurance_claim_number text,
  preventative_action text,
  status text NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.facility_incident_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES core.facility_incident_reports(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  action_type text NOT NULL DEFAULT 'note',
  actor_name text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facility_incident_reports_org ON core.facility_incident_reports(organization_id);

CREATE INDEX IF NOT EXISTS idx_facility_incident_timelines_incident ON core.facility_incident_timelines(incident_id);

CREATE TABLE IF NOT EXISTS core.mbo_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES core.mbo_objectives(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'individual' CHECK (level IN ('company', 'department', 'individual', 'project')),
  department_name text,
  owner_id uuid,
  owner_name text NOT NULL,
  title text NOT NULL,
  description text,
  success_criteria text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'in_progress', 'completed', 'canceled')),
  start_date date NOT NULL,
  target_date date NOT NULL,
  weight integer NOT NULL DEFAULT 100 CHECK (weight >= 0 AND weight <= 100),
  progress_rate integer NOT NULL DEFAULT 0 CHECK (progress_rate >= 0 AND progress_rate <= 100),
  rejection_reason text,
  approved_by uuid,
  approved_at timestamptz,
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.mbo_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES core.mbo_objectives(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  owner_id uuid,
  owner_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'in_progress', 'completed', 'canceled')),
  start_date date NOT NULL,
  target_date date NOT NULL,
  evaluation_period text NOT NULL DEFAULT '2026-Q1',
  progress_rate integer NOT NULL DEFAULT 0 CHECK (progress_rate >= 0 AND progress_rate <= 100),
  rejection_reason text,
  approved_by uuid,
  approved_at timestamptz,
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.mbo_progress_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.mbo_projects(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  progress_rate integer NOT NULL CHECK (progress_rate >= 0 AND progress_rate <= 100),
  achievements text NOT NULL,
  issues_and_actions text,
  next_steps text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.mbo_feedback_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.mbo_projects(id) ON DELETE CASCADE,
  progress_log_id uuid REFERENCES core.mbo_progress_logs(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'manager',
  feedback_type text NOT NULL DEFAULT 'comment' CHECK (feedback_type IN ('comment', 'revision_request', 'praise')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.mbo_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.mbo_projects(id) ON DELETE CASCADE,
  target_user_id uuid,
  evaluator_id uuid,
  evaluator_name text NOT NULL,
  evaluation_type text NOT NULL DEFAULT 'manager' CHECK (evaluation_type IN ('self', 'peer', 'manager', 'final')),
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  grade text NOT NULL CHECK (grade IN ('S', 'A', 'B', 'C', 'D')),
  qualitative_feedback text NOT NULL,
  is_confidential boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mbo_objectives_org ON core.mbo_objectives(organization_id);

CREATE INDEX IF NOT EXISTS idx_mbo_objectives_parent ON core.mbo_objectives(parent_id);

CREATE INDEX IF NOT EXISTS idx_mbo_objectives_owner ON core.mbo_objectives(owner_id);

CREATE INDEX IF NOT EXISTS idx_mbo_objectives_status ON core.mbo_objectives(status);

CREATE INDEX IF NOT EXISTS idx_mbo_projects_org ON core.mbo_projects(organization_id);

CREATE INDEX IF NOT EXISTS idx_mbo_projects_objective ON core.mbo_projects(objective_id);

CREATE INDEX IF NOT EXISTS idx_mbo_projects_owner ON core.mbo_projects(owner_id);

CREATE INDEX IF NOT EXISTS idx_mbo_projects_status ON core.mbo_projects(status);

CREATE INDEX IF NOT EXISTS idx_mbo_progress_logs_org ON core.mbo_progress_logs(organization_id);

CREATE INDEX IF NOT EXISTS idx_mbo_progress_logs_project ON core.mbo_progress_logs(project_id);

CREATE INDEX IF NOT EXISTS idx_mbo_progress_logs_date ON core.mbo_progress_logs(log_date);

CREATE INDEX IF NOT EXISTS idx_mbo_feedback_comments_org ON core.mbo_feedback_comments(organization_id);

CREATE INDEX IF NOT EXISTS idx_mbo_feedback_comments_project ON core.mbo_feedback_comments(project_id);

CREATE INDEX IF NOT EXISTS idx_mbo_evaluations_org ON core.mbo_evaluations(organization_id);

CREATE INDEX IF NOT EXISTS idx_mbo_evaluations_project ON core.mbo_evaluations(project_id);

CREATE INDEX IF NOT EXISTS idx_mbo_evaluations_target ON core.mbo_evaluations(target_user_id);

CREATE TABLE IF NOT EXISTS core.approval_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'expense', 'purchase', 'leave', 'work_order', 'it_change')),
  description text,
  form_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_templates_org_cat
  ON core.approval_templates (organization_id, category);

COMMENT ON TABLE core.approval_templates IS '부서별 전자결재 양식 템플릿 및 기본 결재선 설정';

CREATE TABLE IF NOT EXISTS core.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  template_id uuid REFERENCES core.approval_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  requester_id uuid,
  requester_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'canceled')),
  current_step_order integer NOT NULL DEFAULT 1,
  total_steps integer NOT NULL DEFAULT 1,
  entity_type text,   entity_id text,
  final_approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_org_status
  ON core.approval_requests (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_approval_requests_requester
  ON core.approval_requests (organization_id, requester_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_entity
  ON core.approval_requests (organization_id, entity_type, entity_id);

COMMENT ON TABLE core.approval_requests IS '전사 공통 전자결재 기안 문서 및 최종 진행 상태 대장';

CREATE TABLE IF NOT EXISTS core.approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES core.approval_requests(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_type text NOT NULL DEFAULT 'approval' CHECK (step_type IN ('review', 'approval', 'consensus')),
  approver_id uuid,
  approver_name text NOT NULL,
  approver_role text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'pending', 'approved', 'rejected', 'skipped')),
  comment text,
  signature_url text,   processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_approval_step_order UNIQUE (request_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_approval_steps_approver
  ON core.approval_steps (organization_id, approver_id, status);

COMMENT ON TABLE core.approval_steps IS '기안 문서별 다단계 결재선(검토·승인·합의), 서명 및 심사의견';

CREATE TABLE IF NOT EXISTS core.task_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  order_type text NOT NULL DEFAULT 'custom_order' CHECK (order_type IN ('custom_order', 'repair', 'manufacturing', 'maintenance', 'inspection')),
  title text NOT NULL,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  target_item_name text,
  current_stage text NOT NULL DEFAULT 'RECEIVED' CHECK (current_stage IN ('RECEIVED', 'IN_PROGRESS', 'PARTS_WAITING', 'INSPECTION', 'READY_FOR_PICKUP', 'COMPLETED', 'ON_HOLD', 'CANCELLED')),
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  assigned_staff_id uuid REFERENCES core.staff(id) ON DELETE SET NULL,
  assigned_staff_name text,
  sla_hours integer NOT NULL DEFAULT 24,
  labor_fee numeric(12, 2) NOT NULL DEFAULT 0,
  parts_cost numeric(12, 2) NOT NULL DEFAULT 0,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  diagnosis text,
  hold_reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_task_orders_org_number UNIQUE (organization_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_task_orders_org_stage
  ON core.task_orders (organization_id, current_stage);

CREATE INDEX IF NOT EXISTS idx_task_orders_org_type
  ON core.task_orders (organization_id, order_type);

CREATE INDEX IF NOT EXISTS idx_task_orders_org_cust
  ON core.task_orders (organization_id, customer_id);

COMMENT ON TABLE core.task_orders IS '전사 작업 공정 파이프라인 및 주문제작/정비 작업 주문 대장';

CREATE TABLE IF NOT EXISTS core.task_order_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  task_order_id uuid NOT NULL REFERENCES core.task_orders(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by_user_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_order_timelines_order
  ON core.task_order_timelines (organization_id, task_order_id);

COMMENT ON TABLE core.task_order_timelines IS '작업 주문 공정 단계 전이 불변 이력 및 타임라인 로그';

ALTER TABLE core.stock_movements
  ADD COLUMN IF NOT EXISTS lot_number text,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS source_location_id uuid,
  ADD COLUMN IF NOT EXISTS destination_location_id uuid;

CREATE INDEX IF NOT EXISTS idx_stock_movements_lot
  ON core.stock_movements (organization_id, lot_number)
  WHERE lot_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_expiry
  ON core.stock_movements (organization_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS core.stock_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES core.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES core.product_variants(id) ON DELETE CASCADE,
  lot_number text NOT NULL,
  expiry_date date,
  quantity numeric(14, 3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  location_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_stock_lots_org_prod_lot UNIQUE (organization_id, product_id, lot_number)
);

CREATE INDEX IF NOT EXISTS idx_stock_lots_org_expiry
  ON core.stock_lots (organization_id, expiry_date ASC);

COMMENT ON TABLE core.stock_lots IS '품목 로트별 실시간 잔여 재고 및 유효기간(FEFO) 추적 대장';

ALTER TABLE core.products
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE core.mbo_objectives
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_bookable_resources_metadata_gin 
  ON core.bookable_resources USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_task_orders_details_gin 
  ON core.task_orders USING gin (details jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_staff_metadata_gin 
  ON core.staff USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_facility_incident_reports_metadata_gin 
  ON core.facility_incident_reports USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_approval_requests_content_gin 
  ON core.approval_requests USING gin (content jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_products_metadata_gin 
  ON core.products USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_mbo_objectives_metadata_gin 
  ON core.mbo_objectives USING gin (metadata jsonb_path_ops);

CREATE TABLE IF NOT EXISTS core.generic_entity_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  reference_id UUID,
  record_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_generic_entity_org_type 
  ON core.generic_entity_records (organization_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_generic_entity_org_type_key 
  ON core.generic_entity_records (organization_id, entity_type, record_key);

CREATE INDEX IF NOT EXISTS idx_generic_entity_payload_gin 
  ON core.generic_entity_records USING gin (payload jsonb_path_ops);

ALTER TABLE core.room_reservations
  ADD COLUMN IF NOT EXISTS time_slot TSTZRANGE;

UPDATE core.room_reservations
  SET time_slot = tstzrange(starts_at, ends_at, '[)')
  WHERE time_slot IS NULL AND starts_at IS NOT NULL AND ends_at IS NOT NULL;

CREATE OR REPLACE FUNCTION core.sync_room_reservation_timeslot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.time_slot := tstzrange(NEW.starts_at, NEW.ends_at, '[)');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_room_reservation_timeslot ON core.room_reservations;
CREATE TRIGGER trg_sync_room_reservation_timeslot
  BEFORE INSERT OR UPDATE OF starts_at, ends_at ON core.room_reservations
  FOR EACH ROW EXECUTE FUNCTION core.sync_room_reservation_timeslot();

ALTER TABLE core.room_reservations
  DROP CONSTRAINT IF EXISTS room_reservations_no_overlap,
  DROP CONSTRAINT IF EXISTS no_double_booking;

ALTER TABLE core.room_reservations
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    room_id WITH =,
    time_slot WITH &&
  )
  WHERE (status IN ('pending', 'approved'));

ALTER TABLE core.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(name, '') || ' ' ||
      coalesce(product_code, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON core.products USING gin (search_vector);

ALTER TABLE core.mbo_objectives
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

ALTER TABLE core.mbo_evaluations
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

ALTER TABLE core.mbo_evaluations
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'DRAFT'
    CHECK (workflow_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED'));

CREATE TABLE IF NOT EXISTS core.mbo_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  evaluator_id uuid,
  title text NOT NULL,
  key_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED')),
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.mbo_evaluation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  evaluation_id uuid NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('CREATED', 'SUBMITTED', 'EVALUATED', 'APPROVED')),
  actor_id uuid NOT NULL,
  score_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_org_name
  ON core.departments (organization_id, lower(btrim(name)));

ALTER TABLE core.staff
  ADD COLUMN IF NOT EXISTS department_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_department_id_fkey'
  ) THEN
    ALTER TABLE core.staff
      ADD CONSTRAINT staff_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES core.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departments_manager_staff_id_fkey'
  ) THEN
    ALTER TABLE core.departments
      ADD CONSTRAINT departments_manager_staff_id_fkey
      FOREIGN KEY (manager_staff_id) REFERENCES core.staff(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_department ON core.staff (department_id);

CREATE INDEX IF NOT EXISTS idx_departments_org ON core.departments (organization_id);

CREATE TABLE IF NOT EXISTS core.mbo_cycle_settings (
  organization_id uuid PRIMARY KEY REFERENCES core.organizations(id) ON DELETE CASCADE,
  goal_lock_enabled boolean NOT NULL DEFAULT true,
  goal_lock_month integer NOT NULL DEFAULT 1 CHECK (goal_lock_month BETWEEN 1 AND 12),
  goal_lock_day integer NOT NULL DEFAULT 31 CHECK (goal_lock_day BETWEEN 1 AND 31),
  review_start_month integer NOT NULL DEFAULT 12 CHECK (review_start_month BETWEEN 1 AND 12),
  review_start_day integer NOT NULL DEFAULT 1 CHECK (review_start_day BETWEEN 1 AND 31),
  review_end_month integer NOT NULL DEFAULT 12 CHECK (review_end_month BETWEEN 1 AND 12),
  review_end_day integer NOT NULL DEFAULT 31 CHECK (review_end_day BETWEEN 1 AND 31),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS core.anonymous_grievances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  author_user_id uuid,
  visibility text NOT NULL DEFAULT 'named' CHECK (visibility IN ('named', 'anonymous')),
  ticket_code text NOT NULL,
  access_pin_hash text,
  category text NOT NULL DEFAULT 'GENERAL_GRIEVANCE',
  subject_title text NOT NULL,
  incident_content text NOT NULL,
  evidence_attached boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED')),
  investigation_feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT anonymous_grievances_ticket_unique UNIQUE (organization_id, ticket_code)
);

CREATE INDEX IF NOT EXISTS idx_anonymous_grievances_org_submitted
  ON core.anonymous_grievances (organization_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_anonymous_grievances_author
  ON core.anonymous_grievances (organization_id, author_user_id);

ALTER TABLE core.departments
  ADD COLUMN IF NOT EXISTS code VARCHAR(32);

ALTER TABLE core.departments ADD COLUMN IF NOT EXISTS parent_id UUID NULL REFERENCES core.departments(id) ON DELETE RESTRICT;

ALTER TABLE core.departments ADD COLUMN IF NOT EXISTS path TEXT;

ALTER TABLE core.departments ADD COLUMN IF NOT EXISTS depth INT NOT NULL DEFAULT 1;

ALTER TABLE core.departments ALTER COLUMN path SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_departments_tenant_path
  ON core.departments (organization_id, path);

CREATE TABLE IF NOT EXISTS core.seat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 1 CHECK (capacity > 0),
  status TEXT NOT NULL DEFAULT 'available',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.rental_equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  asset_tag TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  current_renter_id TEXT,
  rented_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  damage_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.equipment_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  serial_no TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_service',
  purchased_at DATE,
  next_service_at DATE,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.maintenance_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.safety_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.safety_consent_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  consent_id TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.sop_risk_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  hazard_level TEXT NOT NULL DEFAULT 'medium',
  controls JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seat_rooms_org ON core.seat_rooms (organization_id);

CREATE INDEX IF NOT EXISTS idx_rental_equipments_org ON core.rental_equipments (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_equipment_lifecycle_org ON core.equipment_lifecycle (organization_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_checklists_org ON core.maintenance_checklists (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_safety_consents_org ON core.safety_consents (organization_id);

CREATE INDEX IF NOT EXISTS idx_sop_risk_org ON core.sop_risk_assessment (organization_id);

ALTER TABLE core.mbo_goals
  ADD COLUMN IF NOT EXISTS target_value NUMERIC,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS is_revised BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revision_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unmet_reason TEXT,
  ADD COLUMN IF NOT EXISTS revision_reason TEXT,
  ADD COLUMN IF NOT EXISTS visibility_type VARCHAR(16) NOT NULL DEFAULT 'PRIVATE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mbo_goals_visibility_type_check'
  ) THEN
    ALTER TABLE core.mbo_goals
      ADD CONSTRAINT mbo_goals_visibility_type_check
      CHECK (visibility_type IN ('PUBLIC', 'PRIVATE', 'PARTIAL'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS core.mbo_goal_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES core.mbo_goals(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  revised_by UUID NOT NULL,
  previous_target_value NUMERIC,
  previous_due_date DATE,
  previous_title TEXT,
  unmet_reason TEXT,
  revision_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mbo_goal_revisions_goal
  ON core.mbo_goal_revisions (goal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS core.mbo_goal_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES core.mbo_goals(id) ON DELETE CASCADE,
  shared_with_member_id UUID NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mbo_goal_shares_unique UNIQUE (goal_id, shared_with_member_id)
);

CREATE INDEX IF NOT EXISTS idx_mbo_goal_shares_member
  ON core.mbo_goal_shares (shared_with_member_id);

CREATE TABLE IF NOT EXISTS core.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  document_no VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  process_name VARCHAR(64) NOT NULL,
  current_version INT NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  created_by UUID NOT NULL,
  snapshot_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occasional_review_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT risk_assessments_status_check CHECK (
    status IN ('DRAFT', 'REVIEW_PENDING', 'APPROVAL_PENDING', 'APPROVED', 'LOCKED')
  ),
  CONSTRAINT risk_assessments_document_no_org_unique UNIQUE (organization_id, document_no)
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_org_status
  ON core.risk_assessments (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_org_dept
  ON core.risk_assessments (organization_id, department_id);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_created_by
  ON core.risk_assessments (organization_id, created_by);

COMMENT ON TABLE core.risk_assessments IS
  '작업표준·위험성평가 문서 헤더. 3단계 결재(작성-검토-승인) 상태 머신 소유.';

CREATE TABLE IF NOT EXISTS core.document_approval_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES core.risk_assessments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type VARCHAR(16) NOT NULL,
  assignee_id UUID NOT NULL,
  assignee_name TEXT,
  action_status VARCHAR(16) NOT NULL DEFAULT 'WAIT',
  comment TEXT,
  signature_data TEXT,
  action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT document_approval_lines_step_order_check CHECK (step_order IN (1, 2, 3)),
  CONSTRAINT document_approval_lines_step_type_check CHECK (
    step_type IN ('DRAFT', 'REVIEW', 'APPROVE')
  ),
  CONSTRAINT document_approval_lines_action_status_check CHECK (
    action_status IN ('WAIT', 'APPROVED', 'REJECTED')
  ),
  CONSTRAINT uq_document_approval_line_order UNIQUE (assessment_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_document_approval_lines_assignee
  ON core.document_approval_lines (organization_id, assignee_id, action_status);

COMMENT ON TABLE core.document_approval_lines IS
  '위험성평가 문서별 3단계 결재선(1작성/2검토/3승인) 및 자필 서명.';

CREATE TABLE IF NOT EXISTS core.risk_assessment_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES core.risk_assessments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  version INT NOT NULL,
  revision_type VARCHAR(16) NOT NULL,
  revision_reason TEXT NOT NULL,
  snapshot_payload JSONB NOT NULL,
  approved_by UUID NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT risk_assessment_revisions_type_check CHECK (
    revision_type IN ('INITIAL', 'PERIODIC', 'OCCASIONAL')
  ),
  CONSTRAINT uq_risk_assessment_revision_version UNIQUE (assessment_id, version)
);

CREATE INDEX IF NOT EXISTS idx_risk_assessment_revisions_assessment
  ON core.risk_assessment_revisions (assessment_id, version DESC);

COMMENT ON TABLE core.risk_assessment_revisions IS
  '승인 완료 위험성평가 불변(WORM) 개정 스냅샷. UPDATE/DELETE 영구 차단.';

CREATE TABLE IF NOT EXISTS core.risk_assessment_worker_repledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES core.risk_assessments(id) ON DELETE CASCADE,
  department_id UUID NULL,
  required_version INT NOT NULL,
  worker_user_id UUID NOT NULL,
  pledged_at TIMESTAMPTZ,
  signature_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_risk_repledge_worker_version UNIQUE (assessment_id, worker_user_id, required_version)
);

CREATE INDEX IF NOT EXISTS idx_risk_repledge_pending
  ON core.risk_assessment_worker_repledges (organization_id, worker_user_id)
  WHERE pledged_at IS NULL;

COMMENT ON TABLE core.risk_assessment_worker_repledges IS
  '작업표준 개정(APPROVED) 시 해당 공정 작업자 TBM 재서약 대기/완료 대장.';

CREATE TABLE IF NOT EXISTS core.project_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  category_key VARCHAR(64) NOT NULL,
  label VARCHAR(64) NOT NULL,
  color VARCHAR(16),
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_categories_key_not_blank CHECK (length(btrim(category_key)) > 0),
  CONSTRAINT project_categories_label_not_blank CHECK (length(btrim(label)) > 0),
  CONSTRAINT uq_project_categories_org_key UNIQUE (organization_id, category_key)
);

CREATE INDEX IF NOT EXISTS idx_project_categories_org_active
  ON core.project_categories (organization_id, is_active, sort_order);

COMMENT ON TABLE core.project_categories IS
  '사업장 사용자 정의 프로젝트 분류 마스터. 하드 삭제 대신 is_active=false 권장.';

ALTER TABLE core.mbo_projects
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES core.project_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mbo_projects_org_category
  ON core.mbo_projects (organization_id, category_id);

CREATE TABLE IF NOT EXISTS core.research_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  code VARCHAR(64),
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'gate_review', 'completed', 'suspended', 'canceled')),
  category_id UUID REFERENCES core.project_categories(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget_planned NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (budget_planned >= 0),
  budget_spent NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (budget_spent >= 0),
  progress_rate INTEGER NOT NULL DEFAULT 0 CHECK (progress_rate >= 0 AND progress_rate <= 100),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_projects_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT research_projects_date_range CHECK (end_date >= start_date),
  CONSTRAINT research_projects_budget_spent_lte_planned CHECK (budget_spent <= budget_planned)
);

CREATE TABLE IF NOT EXISTS core.research_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES core.research_projects(id) ON DELETE CASCADE,
  member_id UUID,
  member_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('lead', 'co_lead', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_project_members_name_not_blank CHECK (length(btrim(member_name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_research_project_one_lead
  ON core.research_project_members (project_id)
  WHERE role = 'lead';

CREATE TABLE IF NOT EXISTS core.research_project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES core.research_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'submitted', 'accepted', 'rejected')),
  evidence_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_project_deliverables_title_not_blank CHECK (length(btrim(title)) > 0)
);

CREATE TABLE IF NOT EXISTS core.research_project_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES core.research_projects(id) ON DELETE CASCADE,
  gate_order INTEGER NOT NULL CHECK (gate_order >= 1),
  title TEXT NOT NULL,
  criteria TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  decided_by UUID,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_project_gates_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT uq_research_project_gates_order UNIQUE (project_id, gate_order)
);

CREATE INDEX IF NOT EXISTS idx_research_projects_org_status
  ON core.research_projects (organization_id, status, start_date);

CREATE INDEX IF NOT EXISTS idx_research_projects_org_category
  ON core.research_projects (organization_id, category_id);

CREATE INDEX IF NOT EXISTS idx_research_project_members_project
  ON core.research_project_members (project_id, role);

CREATE INDEX IF NOT EXISTS idx_research_project_deliverables_project
  ON core.research_project_deliverables (project_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_research_project_gates_project
  ON core.research_project_gates (project_id, gate_order);

COMMENT ON TABLE core.research_projects IS
  '연구과제 SoT. MBO 평가용 mbo_projects와 독립.';

COMMENT ON TABLE core.research_project_gates IS
  '연구과제 단계 게이트(1~n차). 이전 게이트 승인 후에만 다음 차수 승인 가능(도메인 규칙).';

ALTER TABLE core.research_project_gates
  ADD COLUMN IF NOT EXISTS approval_request_id UUID
    REFERENCES core.approval_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_research_project_gates_approval
  ON core.research_project_gates (approval_request_id)
  WHERE approval_request_id IS NOT NULL;

ALTER TABLE core.research_project_gates
  DROP CONSTRAINT IF EXISTS research_project_gates_status_check;

ALTER TABLE core.research_project_gates
  ADD CONSTRAINT research_project_gates_status_check
  CHECK (status IN ('pending', 'in_approval', 'approved', 'rejected', 'skipped'));

COMMENT ON COLUMN core.research_project_gates.approval_request_id IS
  'approval_workflow 기안 문서 ID (entity_type=research_project_gate)';

CREATE TABLE IF NOT EXISTS core.resource_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL,
  kind_slug VARCHAR(64) NOT NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  spec_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT resource_types_category_check CHECK (category IN ('EQUIPMENT', 'SPACE')),
  CONSTRAINT resource_types_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT resource_types_kind_slug_format CHECK (kind_slug ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT uq_resource_types_org_kind UNIQUE (organization_id, kind_slug)
);

CREATE INDEX IF NOT EXISTS idx_resource_types_org
  ON core.resource_types (organization_id, category);

COMMENT ON TABLE core.resource_types IS
  '총무팀 정의 공용자원 종류 카탈로그. kind_slug는 core.bookable_resources.kind 와 매칭.';

CREATE TABLE IF NOT EXISTS core.patents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  application_no VARCHAR(64) NOT NULL DEFAULT '',
  title VARCHAR(128) NOT NULL,
  summary TEXT,
  tech_field VARCHAR(64),
  inventor_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  filing_date DATE,
  document_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patents_title_not_blank CHECK (length(btrim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_patents_org_status
  ON core.patents (organization_id, status, created_at DESC);

ALTER TABLE core.room_reservations
  ALTER COLUMN customer_id DROP NOT NULL;

COMMENT ON COLUMN core.room_reservations.customer_id IS
  '학원·고객 예약 시 customers.id. 사내 직원 예약(request_member_room_reservation)은 NULL.';

CREATE TABLE IF NOT EXISTS core.shuttle_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL,
  direction VARCHAR(16) NOT NULL DEFAULT 'FROM_WORK',
  departure_time TIME NOT NULL,
  capacity INT NOT NULL DEFAULT 45,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shuttle_routes_direction_check CHECK (direction IN ('TO_WORK', 'FROM_WORK')),
  CONSTRAINT shuttle_routes_capacity_positive CHECK (capacity > 0),
  CONSTRAINT shuttle_routes_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_shuttle_routes_tenant
  ON core.shuttle_routes (tenant_id, is_active, departure_time);

CREATE TABLE IF NOT EXISTS core.shuttle_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES core.shuttle_routes(id) ON DELETE CASCADE,
  stop_order INT NOT NULL,
  stop_name VARCHAR(64) NOT NULL,
  pickup_time TIME,
  dropoff_time TIME,
  pickup_location_detail TEXT,
  is_pickup BOOLEAN NOT NULL DEFAULT true,
  is_dropoff BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT shuttle_stops_route_order_unique UNIQUE (route_id, stop_order),
  CONSTRAINT shuttle_stops_name_not_blank CHECK (length(btrim(stop_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_shuttle_stops_route
  ON core.shuttle_stops (route_id, stop_order);

CREATE TABLE IF NOT EXISTS core.shuttle_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  route_id UUID REFERENCES core.shuttle_routes(id) ON DELETE SET NULL,
  pickup_stop_id UUID REFERENCES core.shuttle_stops(id) ON DELETE SET NULL,
  dropoff_stop_id UUID REFERENCES core.shuttle_stops(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shuttle_registrations_tenant_member_unique UNIQUE (tenant_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_shuttle_registrations_route
  ON core.shuttle_registrations (tenant_id, route_id, is_active);

COMMENT ON TABLE core.shuttle_routes IS '사내 통근 셔틀 노선 마스터';

COMMENT ON TABLE core.shuttle_stops IS '노선별 정류장 및 승·하차 예정 시각';

COMMENT ON TABLE core.shuttle_registrations IS '임직원 고정 셔틀 탑승 등록 (사원당 1행)';

CREATE TABLE IF NOT EXISTS core.stock_locations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  code              TEXT NOT NULL,
  department_id     UUID REFERENCES core.departments(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_locations_name_check CHECK (length(btrim(name)) > 0),
  CONSTRAINT stock_locations_code_check CHECK (length(btrim(code)) > 0),
  CONSTRAINT uq_stock_locations_org_code UNIQUE (organization_id, code)
);

COMMENT ON TABLE core.stock_locations IS
  '자재·부서 창고. core.locations(영업 지점)과 분리. department_id NULL = 전사(central) 공유.';

CREATE INDEX IF NOT EXISTS idx_stock_locations_org_active
  ON core.stock_locations (organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_stock_locations_org_department
  ON core.stock_locations (organization_id, department_id);

ALTER TABLE core.inventory
  ADD COLUMN IF NOT EXISTS stock_location_id UUID;

ALTER TABLE core.inventory
  ALTER COLUMN stock_location_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stock_location_id_fkey'
  ) THEN
    ALTER TABLE core.inventory
      ADD CONSTRAINT inventory_stock_location_id_fkey
      FOREIGN KEY (stock_location_id) REFERENCES core.stock_locations(id) ON DELETE RESTRICT;
  END IF;
END $$;

DROP INDEX IF EXISTS core.uq_inventory_org_product_no_variant;
DROP INDEX IF EXISTS core.uq_inventory_org_variant;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_product_location_no_variant
  ON core.inventory (organization_id, product_id, stock_location_id)
  WHERE variant_id IS NULL AND product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_variant_location
  ON core.inventory (organization_id, variant_id, stock_location_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_org_location
  ON core.inventory (organization_id, stock_location_id);

ALTER TABLE core.stock_movements
  ADD COLUMN IF NOT EXISTS stock_location_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_stock_location_id_fkey'
  ) THEN
    ALTER TABLE core.stock_movements
      ADD CONSTRAINT stock_movements_stock_location_id_fkey
      FOREIGN KEY (stock_location_id) REFERENCES core.stock_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_source_stock_location_fkey'
  ) THEN
    ALTER TABLE core.stock_movements
      ADD CONSTRAINT stock_movements_source_stock_location_fkey
      FOREIGN KEY (source_location_id) REFERENCES core.stock_locations(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN
    -- 기존 UUID가 locations(지점) 등을 가리키면 FK 추가 실패 → 컬럼만 유지
    RAISE NOTICE 'skip source_location_id FK: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_dest_stock_location_fkey'
  ) THEN
    ALTER TABLE core.stock_movements
      ADD CONSTRAINT stock_movements_dest_stock_location_fkey
      FOREIGN KEY (destination_location_id) REFERENCES core.stock_locations(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'skip destination_location_id FK: %', SQLERRM;
END $$;

ALTER TABLE core.stock_lots
  ADD COLUMN IF NOT EXISTS stock_location_id UUID;

CREATE TABLE IF NOT EXISTS core.volunteer_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  activity_type VARCHAR(64) NOT NULL DEFAULT 'general',
  description TEXT,
  capacity INT NOT NULL,
  event_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  created_by_member_id UUID REFERENCES core.organization_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT volunteer_activities_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT volunteer_activities_capacity_positive CHECK (capacity > 0),
  CONSTRAINT volunteer_activities_status_check CHECK (status IN ('open', 'closed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_volunteer_activities_org_status
  ON core.volunteer_activities (organization_id, status, event_date DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS core.volunteer_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES core.volunteer_activities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT volunteer_signups_activity_member_unique UNIQUE (activity_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_volunteer_signups_activity
  ON core.volunteer_signups (activity_id, created_at);

CREATE INDEX IF NOT EXISTS idx_volunteer_signups_member
  ON core.volunteer_signups (organization_id, member_id);

CREATE TABLE IF NOT EXISTS core.meal_survey_settings (
  organization_id UUID PRIMARY KEY REFERENCES core.organizations(id) ON DELETE CASCADE,
  offer_breakfast BOOLEAN NOT NULL DEFAULT false,
  offer_lunch BOOLEAN NOT NULL DEFAULT true,
  offer_dinner BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meal_survey_settings_at_least_one CHECK (
    offer_breakfast OR offer_lunch OR offer_dinner
  )
);

CREATE TABLE IF NOT EXISTS core.meal_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  meal_slot VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meal_survey_responses_slot_check CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner')),
  CONSTRAINT meal_survey_responses_status_check CHECK (status IN ('eating', 'skipping')),
  CONSTRAINT meal_survey_responses_member_date_slot_unique UNIQUE (member_id, meal_date, meal_slot)
);

CREATE INDEX IF NOT EXISTS idx_meal_survey_responses_org_date
  ON core.meal_survey_responses (organization_id, meal_date, meal_slot);

CREATE INDEX IF NOT EXISTS idx_meal_survey_responses_member
  ON core.meal_survey_responses (member_id, meal_date);

CREATE TABLE IF NOT EXISTS core.office_supply_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '개',
  estimated_unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT office_supply_catalog_items_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT office_supply_catalog_items_price_nonneg CHECK (estimated_unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_office_supply_catalog_org_active
  ON core.office_supply_catalog_items (organization_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS core.office_supply_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  closed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT office_supply_campaigns_ym_check CHECK (year_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT office_supply_campaigns_status_check CHECK (status IN ('open', 'closed')),
  CONSTRAINT office_supply_campaigns_org_ym_unique UNIQUE (organization_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_office_supply_campaigns_org_ym
  ON core.office_supply_campaigns (organization_id, year_month DESC);

CREATE TABLE IF NOT EXISTS core.office_supply_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES core.office_supply_campaigns(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  department_id UUID REFERENCES core.departments(id) ON DELETE SET NULL,
  catalog_item_id UUID NOT NULL REFERENCES core.office_supply_catalog_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT office_supply_request_lines_qty_pos CHECK (quantity > 0),
  CONSTRAINT office_supply_request_lines_unique
    UNIQUE (campaign_id, member_id, catalog_item_id)
);

CREATE INDEX IF NOT EXISTS idx_office_supply_lines_campaign
  ON core.office_supply_request_lines (campaign_id, department_id);

CREATE INDEX IF NOT EXISTS idx_office_supply_lines_member
  ON core.office_supply_request_lines (member_id, campaign_id);

ALTER TABLE core.meal_survey_settings
  ADD COLUMN IF NOT EXISTS default_eating BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS breakfast_cutoff_time TIME NOT NULL DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS breakfast_cutoff_prev_day BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lunch_cutoff_time TIME NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS lunch_cutoff_prev_day BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dinner_cutoff_time TIME NOT NULL DEFAULT '15:00',
  ADD COLUMN IF NOT EXISTS dinner_cutoff_prev_day BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE core.volunteer_signups
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

ALTER TABLE core.shuttle_routes
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS driver_phone TEXT;

COMMENT ON COLUMN core.shuttle_routes.driver_name IS '담당 기사 표시명';

COMMENT ON COLUMN core.shuttle_routes.driver_phone IS '담당 기사 연락처(표시·tel 링크용)';
