/**
 * W1 필수축 PG 직접 스모크: 결재·재고·발주·제보
 * PostgREST 불필요. SOP PG 스모크와 동일 DB URL 규칙.
 *
 *   npm run test:required-ops-lifecycle-pg
 */
import pg from 'pg';
import { createHash } from 'node:crypto';

function resolveDbUrl() {
  const preferred =
    process.env.EP_SOP_SMOKE_DATABASE_URL?.trim() ||
    process.env.EP_LOCAL_AUTH_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    '';
  if (!preferred || /:\/\/ep:ep@/i.test(preferred)) {
    return (
      process.env.EP_SOP_SMOKE_DATABASE_URL?.trim() ||
      'postgresql://postgres:ep@127.0.0.1:54329/ep_local'
    );
  }
  return preferred;
}

const url = resolveDbUrl();
const loginId = (process.env.EP_STAGING_EMAIL || 'rndceo').trim().toLowerCase();
const stamp = Date.now().toString().slice(-8);

function fail(msg, detail) {
  console.error(msg, detail ?? '');
  process.exit(1);
}

function pinHash(pin) {
  return createHash('sha256').update(`ep_grievance_v1:${pin.trim()}`).digest('hex');
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
const client = await pool.connect();

try {
  await client.query('SET search_path TO app, core, public');

  let userRes = await client.query(
    `SELECT id, email, login_id FROM app.users
     WHERE lower(coalesce(login_id, email)) = $1 OR lower(email) = $1
     LIMIT 1`,
    [loginId]
  );
  let user = userRes.rows[0];
  if (!user?.id) {
    const ownerRes = await client.query(
      `SELECT u.id, u.email, u.login_id
       FROM core.organization_members m
       JOIN app.users u ON u.id = m.user_id
       WHERE m.role = 'owner' AND m.is_active = true AND m.deleted_at IS NULL
       ORDER BY m.joined_at ASC NULLS LAST
       LIMIT 1`
    );
    user = ownerRes.rows[0];
  }
  if (!user?.id) fail('user not found', loginId);

  const memRes = await client.query(
    `SELECT organization_id FROM core.organization_members
     WHERE user_id = $1::uuid AND is_active = true AND deleted_at IS NULL
     ORDER BY joined_at ASC NULLS LAST
     LIMIT 1`,
    [user.id]
  );
  const orgId = memRes.rows[0]?.organization_id;
  if (!orgId) fail('no membership', user.id);

  await client.query(`SELECT set_config('app.user_id', $1, false)`, [String(user.id)]);
  const uidCheck = await client.query(`SELECT app.current_user_id() AS uid`);
  if (!uidCheck.rows[0]?.uid) fail('app.current_user_id() empty', uidCheck.rows[0]);
  console.info('context', { userId: user.id, orgId, loginId });

  // -------------------------------------------------------------------------
  // 1) 결재: draft → pending → approve / reject
  // -------------------------------------------------------------------------
  const approveReq = await client.query(
    `INSERT INTO core.approval_requests (
       organization_id, title, requester_id, requester_name, status, content, total_steps
     ) VALUES ($1::uuid, $2, $3::uuid, 'w1-smoke', 'pending', '{}'::jsonb, 1)
     RETURNING id`,
    [orgId, `w1-approval-approve-${stamp}`, user.id]
  );
  const approveId = approveReq.rows[0].id;
  await client.query(
    `INSERT INTO core.approval_steps (
       organization_id, request_id, step_order, step_type, approver_id, approver_name, status
     ) VALUES ($1::uuid, $2::uuid, 1, 'approval', $3::uuid, 'w1-smoke', 'pending')`,
    [orgId, approveId, user.id]
  );
  const approveRpc = await client.query(
    `SELECT core.process_approval_step_atomic($1::uuid, 'approve', $2) AS r`,
    [approveId, 'w1 approve ok']
  );
  if (!approveRpc.rows[0]?.r?.ok) fail('approve rpc', approveRpc.rows[0]);
  const approveSt = await client.query(
    `SELECT status FROM core.approval_requests WHERE id = $1::uuid`,
    [approveId]
  );
  if (approveSt.rows[0]?.status !== 'approved') fail('expected approved', approveSt.rows[0]);
  console.info('approval approve ok', approveId);

  const rejectReq = await client.query(
    `INSERT INTO core.approval_requests (
       organization_id, title, requester_id, requester_name, status, content, total_steps
     ) VALUES ($1::uuid, $2, $3::uuid, 'w1-smoke', 'pending', '{}'::jsonb, 1)
     RETURNING id`,
    [orgId, `w1-approval-reject-${stamp}`, user.id]
  );
  const rejectId = rejectReq.rows[0].id;
  await client.query(
    `SELECT core.process_approval_step_atomic($1::uuid, 'reject', $2)`,
    [rejectId, 'w1 reject reason']
  );
  const rejectSt = await client.query(
    `SELECT status FROM core.approval_requests WHERE id = $1::uuid`,
    [rejectId]
  );
  if (rejectSt.rows[0]?.status !== 'rejected') fail('expected rejected', rejectSt.rows[0]);
  console.info('approval reject ok', rejectId);

  // -------------------------------------------------------------------------
  // 2) 재고: insert → 수량 감소 → 음수 차단(앱 레벨) / 잔량 검증
  // -------------------------------------------------------------------------
  const inv = await client.query(
    `INSERT INTO core.inventory_items (
       organization_id, name, sku, quantity, unit, unit_cost, metadata
     ) VALUES ($1::uuid, $2, $3, 10, 'ea', 100, '{"w1_smoke":true}'::jsonb)
     RETURNING id, quantity`,
    [orgId, `w1-inv-${stamp}`, `W1-SKU-${stamp}`]
  );
  const invId = inv.rows[0].id;
  await client.query(
    `UPDATE core.inventory_items SET quantity = quantity - 3, updated_at = now() WHERE id = $1::uuid`,
    [invId]
  );
  const invAfter = await client.query(
    `SELECT quantity FROM core.inventory_items WHERE id = $1::uuid`,
    [invId]
  );
  if (Number(invAfter.rows[0]?.quantity) !== 7) fail('inventory qty', invAfter.rows[0]);
  console.info('inventory outbound ok', invId);

  // -------------------------------------------------------------------------
  // 3) 발주: 안전재고 품목 → PO draft → sent
  // -------------------------------------------------------------------------
  const restock = await client.query(
    `INSERT INTO core.supply_restock_items (
       organization_id, item_name, category, current_quantity, safety_threshold,
       optimal_order_quantity, unit, unit_cost, vendor_name, status
     ) VALUES (
       $1::uuid, $2, 'w1', 2, 5, 10, 'ea', 1000, 'W1 Vendor', 'low'
     ) RETURNING id`,
    [orgId, `w1-restock-${stamp}`]
  );
  const restockId = restock.rows[0].id;
  const poNumber = `PO-W1-${stamp}`;
  const po = await client.query(
    `INSERT INTO core.purchase_orders (
       organization_id, po_number, vendor_name, order_items, total_amount, status, memo
     ) VALUES (
       $1::uuid, $2, 'W1 Vendor',
       $3::jsonb, 10000, 'draft', 'w1 smoke'
     ) RETURNING id`,
    [
      orgId,
      poNumber,
      JSON.stringify([
        {
          itemId: restockId,
          itemName: `w1-restock-${stamp}`,
          orderQuantity: 10,
          unit: 'ea',
          unitCost: 1000,
          subtotal: 10000,
        },
      ]),
    ]
  );
  const poId = po.rows[0].id;
  await client.query(
    `UPDATE core.purchase_orders
     SET status = 'sent', sent_at = now()
     WHERE id = $1::uuid`,
    [poId]
  );
  const poSt = await client.query(
    `SELECT status, sent_at IS NOT NULL AS sent FROM core.purchase_orders WHERE id = $1::uuid`,
    [poId]
  );
  if (poSt.rows[0]?.status !== 'sent' || !poSt.rows[0]?.sent) fail('po sent', poSt.rows[0]);
  console.info('supply restock → PO sent ok', poId);

  // -------------------------------------------------------------------------
  // 4) 제보: 익명 접수 → PIN 조회 → 조사 → 종결
  // -------------------------------------------------------------------------
  const ticket = `G-W1-${stamp}`;
  const pin = '4242';
  const gr = await client.query(
    `INSERT INTO core.anonymous_grievances (
       organization_id, author_user_id, visibility, ticket_code, access_pin_hash,
       category, subject_title, incident_content, status
     ) VALUES (
       $1::uuid, NULL, 'anonymous', $2, $3,
       'GENERAL_GRIEVANCE', $4, $5, 'SUBMITTED'
     ) RETURNING id`,
    [
      orgId,
      ticket,
      pinHash(pin),
      `w1-grievance-${stamp}`,
      'W1 smoke anonymous grievance body with enough detail.',
    ]
  );
  const grId = gr.rows[0].id;

  const inquireOk = await client.query(
    `SELECT core.inquire_anonymous_grievance($1::uuid, $2, $3) AS r`,
    [orgId, ticket, pin]
  );
  if (!inquireOk.rows[0]?.r?.ok) fail('inquire ok', inquireOk.rows[0]);

  const inquireBad = await client.query(
    `SELECT core.inquire_anonymous_grievance($1::uuid, $2, $3) AS r`,
    [orgId, ticket, '0000']
  );
  if (inquireBad.rows[0]?.r?.ok !== false || inquireBad.rows[0]?.r?.error !== 'PIN_MISMATCH') {
    fail('inquire pin mismatch expected', inquireBad.rows[0]);
  }

  await client.query(
    `UPDATE core.anonymous_grievances
     SET status = 'UNDER_INVESTIGATION', updated_at = now()
     WHERE id = $1::uuid`,
    [grId]
  );
  await client.query(
    `UPDATE core.anonymous_grievances
     SET status = 'RESOLVED',
         investigation_feedback = 'w1 resolved',
         resolved_at = now(),
         updated_at = now()
     WHERE id = $1::uuid`,
    [grId]
  );
  const grSt = await client.query(
    `SELECT status, investigation_feedback FROM core.anonymous_grievances WHERE id = $1::uuid`,
    [grId]
  );
  if (grSt.rows[0]?.status !== 'RESOLVED') fail('grievance resolved', grSt.rows[0]);
  console.info('grievance lifecycle ok', grId);

  console.info('required ops lifecycle PG smoke passed');
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
} finally {
  client.release();
  await pool.end();
}
