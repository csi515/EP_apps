/**
 * 도메인 SoT 스모크 (Postgres + PostgREST 필수).
 * PGlite-only 환경에서는 실패한다 — Docker: npm run db:up:stack
 *
 * env:
 *   EP_AUTH_API_BASE=http://127.0.0.1:8787/api/local-auth
 *   EP_POSTGREST_URL=http://127.0.0.1:3001
 *   EP_STAGING_EMAIL / EP_STAGING_PASSWORD
 */
const AUTH = (
  process.env.EP_AUTH_API_BASE || 'http://127.0.0.1:8787/api/local-auth'
).replace(/\/$/, '');
const PGRST = (process.env.EP_POSTGREST_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const email = (process.env.EP_STAGING_EMAIL || 'rndceo').trim().toLowerCase();
const password = process.env.EP_STAGING_PASSWORD || 'EpTest123!';
const anon = process.env.VITE_SUPABASE_ANON_KEY || 'ep-anon';

function fail(msg, detail) {
  console.error(msg, detail ?? '');
  process.exit(1);
}

async function auth(path, init = {}) {
  const res = await fetch(`${AUTH}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function pgrst(path, token, init = {}) {
  const res = await fetch(`${PGRST}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${token}`,
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { res, body };
}

function assertOk(label, result, allowStatuses = [200, 201]) {
  if (!allowStatuses.includes(result.res.status)) {
    fail(`${label} failed`, { status: result.res.status, body: result.body });
  }
  console.info(label, result.res.status);
}

const login = await auth('/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});
if (!login.res.ok || !login.body.access_token) {
  fail('login failed', login.body);
}
const token = login.body.access_token;
console.info('login ok', login.body.user?.email, 'jwt_len=', token.length);

const memberships = await auth('/memberships', {
  headers: { Authorization: `Bearer ${token}` },
});
const orgId = memberships.body.memberships?.[0]?.organization_id;
if (!orgId) fail('no organization', memberships.body);
console.info('memberships', memberships.body.memberships?.length, 'org=', orgId);

let orgs;
try {
  orgs = await pgrst(`/organizations?id=eq.${orgId}&select=id,name`, token);
} catch (err) {
  fail(
    'PostgREST unreachable — run `npm run db:up:stack` (Postgres+PostgREST). PGlite is not accepted for domain smoke.',
    err instanceof Error ? err.message : err
  );
}
assertOk('postgrest organizations', orgs, [200]);

const meal = await pgrst('/rpc/ensure_meal_survey_settings', token, {
  method: 'POST',
  body: JSON.stringify({ p_org: orgId }),
});
assertOk('meal rpc', meal, [200, 201]);

const approval = await pgrst('/approval_requests', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    title: 'domain-smoke-approval',
    requester_name: 'smoke',
    status: 'draft',
    content: {},
  }),
});
assertOk('approval insert', approval, [200, 201]);

const approvalPending = await pgrst('/approval_requests', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    title: `domain-smoke-approval-pending-${Date.now().toString().slice(-6)}`,
    requester_name: 'smoke',
    status: 'pending',
    content: {},
  }),
});
assertOk('approval pending insert', approvalPending, [200, 201]);
const approvalPendingId = Array.isArray(approvalPending.body)
  ? approvalPending.body[0]?.id
  : approvalPending.body?.id;
if (!approvalPendingId) fail('approval pending id missing', approvalPending.body);

const approvalApprove = await pgrst('/rpc/process_approval_step_atomic', token, {
  method: 'POST',
  body: JSON.stringify({
    p_request_id: approvalPendingId,
    p_action: 'approve',
    p_comment: 'domain-smoke approve',
  }),
});
assertOk('approval approve rpc', approvalApprove, [200, 201]);

const approvalRejectSeed = await pgrst('/approval_requests', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    title: `domain-smoke-approval-reject-${Date.now().toString().slice(-6)}`,
    requester_name: 'smoke',
    status: 'pending',
    content: {},
  }),
});
assertOk('approval reject seed', approvalRejectSeed, [200, 201]);
const approvalRejectId = Array.isArray(approvalRejectSeed.body)
  ? approvalRejectSeed.body[0]?.id
  : approvalRejectSeed.body?.id;
if (!approvalRejectId) fail('approval reject id missing', approvalRejectSeed.body);
const approvalReject = await pgrst('/rpc/process_approval_step_atomic', token, {
  method: 'POST',
  body: JSON.stringify({
    p_request_id: approvalRejectId,
    p_action: 'reject',
    p_comment: 'domain-smoke reject',
  }),
});
assertOk('approval reject rpc', approvalReject, [200, 201]);

const today = new Date().toISOString().slice(0, 10);
const periodYm = today.slice(0, 7);
const mbo = await pgrst('/mbo_objectives', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    owner_name: 'smoke',
    title: 'domain-smoke-mbo',
    start_date: today,
    target_date: today,
    status: 'draft',
    target_value: 100,
  }),
});
assertOk('mbo insert', mbo, [200, 201]);
const objectiveId = Array.isArray(mbo.body) ? mbo.body[0]?.id : mbo.body?.id;
if (!objectiveId) fail('mbo insert missing id', mbo.body);

const mboProject = await pgrst('/mbo_projects', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    objective_id: objectiveId,
    title: 'domain-smoke-mbo-project',
    owner_name: 'smoke',
    start_date: today,
    target_date: today,
    status: 'in_progress',
    progress_rate: 0,
  }),
});
assertOk('mbo project insert', mboProject, [200, 201]);
const projectId = Array.isArray(mboProject.body)
  ? mboProject.body[0]?.id
  : mboProject.body?.id;
if (!projectId) fail('mbo project missing id', mboProject.body);

const progressLog = await pgrst('/mbo_progress_logs', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    project_id: projectId,
    author_name: 'smoke',
    log_date: today,
    period_ym: periodYm,
    progress_rate: 40,
    achievements: 'domain-smoke monthly checkin',
  }),
});
assertOk('mbo progress_log insert', progressLog, [200, 201]);

const revise = await pgrst('/rpc/revise_mbo_goal', token, {
  method: 'POST',
  body: JSON.stringify({
    p_objective_id: objectiveId,
    p_new_target_value: 90,
    p_new_due_date: today,
    p_unmet_reason: 'smoke unmet',
    p_revision_reason: 'smoke revise',
  }),
});
assertOk('mbo revise rpc', revise, [200, 201]);

const evaluation = await pgrst('/mbo_evaluations', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    project_id: projectId,
    evaluator_name: 'smoke',
    evaluation_type: 'manager',
    score: 88,
    grade: 'A',
    qualitative_feedback: 'domain-smoke evaluation',
    is_confidential: false,
  }),
});
assertOk('mbo evaluation insert', evaluation, [200, 201]);

const confidentialEval = await pgrst('/mbo_evaluations', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    project_id: projectId,
    evaluator_name: 'smoke-confidential',
    evaluation_type: 'manager',
    score: 70,
    grade: 'B',
    qualitative_feedback: 'domain-smoke confidential',
    is_confidential: true,
  }),
});
assertOk('mbo confidential evaluation insert', confidentialEval, [200, 201]);
const confidentialId = Array.isArray(confidentialEval.body)
  ? confidentialEval.body[0]?.id
  : confidentialEval.body?.id;
if (confidentialId) {
  const confList = await pgrst(
    `/mbo_evaluations?id=eq.${confidentialId}&select=id,is_confidential`,
    token
  );
  assertOk('mbo confidential evaluation select (owner/admin JWT)', confList, [200]);
}

const invName = `domain-smoke-item-${Date.now().toString().slice(-6)}`;
const inv = await pgrst('/inventory_items', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    name: invName,
    quantity: 10,
    sku: `SMK-${Date.now().toString().slice(-6)}`,
  }),
});
assertOk('inventory insert', inv, [200, 201]);
const invId = Array.isArray(inv.body) ? inv.body[0]?.id : inv.body?.id;
if (!invId) fail('inventory id missing', inv.body);

const invPatch = await pgrst(`/inventory_items?id=eq.${invId}`, token, {
  method: 'PATCH',
  body: JSON.stringify({ quantity: 7 }),
});
assertOk('inventory outbound patch', invPatch, [200, 204]);

const invList = await pgrst(
  `/inventory_items?id=eq.${invId}&select=id,name,quantity`,
  token
);
assertOk('inventory select', invList, [200]);
if (!Array.isArray(invList.body) || invList.body.length < 1) {
  fail('inventory select empty', invList.body);
}
if (Number(invList.body[0]?.quantity) !== 7) {
  fail('inventory quantity mismatch', invList.body[0]);
}

const restockName = `domain-smoke-restock-${Date.now().toString().slice(-6)}`;
const restock = await pgrst('/supply_restock_items', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    item_name: restockName,
    category: 'smoke',
    current_quantity: 1,
    safety_threshold: 5,
    optimal_order_quantity: 10,
    unit: 'ea',
    unit_cost: 1000,
    vendor_name: 'smoke-vendor',
    status: 'low',
  }),
});
assertOk('supply restock insert', restock, [200, 201]);
const restockId = Array.isArray(restock.body) ? restock.body[0]?.id : restock.body?.id;
const poNumber = `PO-SMK-${Date.now().toString().slice(-6)}`;
const po = await pgrst('/purchase_orders', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    po_number: poNumber,
    vendor_name: 'smoke-vendor',
    order_items: [
      {
        itemId: restockId,
        itemName: restockName,
        orderQuantity: 10,
        unit: 'ea',
        unitCost: 1000,
        subtotal: 10000,
      },
    ],
    total_amount: 10000,
    status: 'draft',
    memo: 'domain-smoke',
  }),
});
assertOk('purchase order insert', po, [200, 201]);
const poId = Array.isArray(po.body) ? po.body[0]?.id : po.body?.id;
if (!poId) fail('purchase order id missing', po.body);
const poSent = await pgrst(`/purchase_orders?id=eq.${poId}`, token, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }),
});
assertOk('purchase order sent', poSent, [200, 204]);

const gr = await pgrst('/anonymous_grievances?select=id&limit=1', token);
assertOk('grievances list', gr, [200]);

const grTicket = `G-SMK-${Date.now().toString().slice(-6)}`;
const grInsert = await pgrst('/anonymous_grievances', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    visibility: 'named',
    ticket_code: grTicket,
    category: 'GENERAL_GRIEVANCE',
    subject_title: 'domain-smoke grievance',
    incident_content: 'domain smoke grievance content with enough length.',
    status: 'SUBMITTED',
    author_user_id: login.body.user?.id ?? null,
  }),
});
assertOk('grievance insert', grInsert, [200, 201]);
const grId = Array.isArray(grInsert.body) ? grInsert.body[0]?.id : grInsert.body?.id;
if (!grId) fail('grievance id missing', grInsert.body);
const grInvestigate = await pgrst(`/anonymous_grievances?id=eq.${grId}`, token, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'UNDER_INVESTIGATION' }),
});
assertOk('grievance investigate', grInvestigate, [200, 204]);
const grResolve = await pgrst(`/anonymous_grievances?id=eq.${grId}`, token, {
  method: 'PATCH',
  body: JSON.stringify({
    status: 'RESOLVED',
    investigation_feedback: 'domain-smoke resolved',
    resolved_at: new Date().toISOString(),
  }),
});
assertOk('grievance resolve', grResolve, [200, 204]);

// ---------------------------------------------------------------------------
// SOP·위험성평가: 초안 → 검토 → 승인 → 개정 → 재서약
// ---------------------------------------------------------------------------
const userId = login.body.user?.id;
if (!userId) fail('login user id missing', login.body.user);

// 단일 JWT로 전 구간 검증: 검토·승인 담당을 로그인 사용자로 둔다.
const reviewerId = userId;
const approverId = userId;

const sopDocNo = `SOP-SMK-${Date.now().toString().slice(-6)}`;
const sopInsert = await pgrst('/risk_assessments', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    department_id: null,
    document_no: sopDocNo,
    title: 'domain-smoke-sop',
    process_name: 'domain-smoke-sop',
    current_version: 1,
    status: 'DRAFT',
    created_by: userId,
    snapshot_payload: {
      steps: [
        {
          id: 'step-smoke-1',
          stepNumber: 1,
          actionTitle: '스모크 작업',
          hazardDesc: '스모크 위험',
          hazardCategory: '기타',
          initialFreq: 2,
          initialSev: 2,
          initialScore: 4,
          initialLevel: 'low',
          sopControlMeasure: '보호구 착용',
          requiredPPE: ['안전모'],
          residualFreq: 1,
          residualSev: 1,
          residualScore: 1,
          residualLevel: 'low',
          assignee: 'smoke',
          actionDeadline: '상시',
          isImplemented: true,
        },
      ],
      prohibitedActions: ['보호구 미착용 금지'],
      deptCode: 'SMK',
      deptName: '스모크',
      intendedReviewerId: reviewerId,
      intendedApproverId: approverId,
      rejectionHistory: [],
    },
  }),
});
assertOk('sop risk draft insert', sopInsert, [200, 201]);
const assessmentId = Array.isArray(sopInsert.body)
  ? sopInsert.body[0]?.id
  : sopInsert.body?.id;
if (!assessmentId) fail('sop draft missing id', sopInsert.body);

const sopSubmit = await pgrst('/rpc/submit_risk_assessment_for_review', token, {
  method: 'POST',
  body: JSON.stringify({
    p_assessment_id: assessmentId,
    p_reviewer_id: reviewerId,
  }),
});
assertOk('sop submit for review rpc', sopSubmit, [200, 204]);

const sopApproveReview = await pgrst('/rpc/approve_risk_assessment_step', token, {
  method: 'POST',
  body: JSON.stringify({
    p_assessment_id: assessmentId,
    p_step_order: 2,
    p_comment: 'domain-smoke review ok',
    p_signature: 'data:image/png;base64,smoke-review',
    p_next_assignee_id: approverId,
  }),
});
assertOk('sop approve review step rpc', sopApproveReview, [200, 204]);

const sopApproveFinal = await pgrst('/rpc/approve_risk_assessment_step', token, {
  method: 'POST',
  body: JSON.stringify({
    p_assessment_id: assessmentId,
    p_step_order: 3,
    p_comment: 'domain-smoke final ok',
    p_signature: 'data:image/png;base64,smoke-approve',
    p_next_assignee_id: null,
  }),
});
assertOk('sop approve final step rpc', sopApproveFinal, [200, 204]);

const sopApproved = await pgrst(
  `/risk_assessments?id=eq.${assessmentId}&select=id,status,current_version`,
  token
);
assertOk('sop approved status select', sopApproved, [200]);
const approvedRow = Array.isArray(sopApproved.body) ? sopApproved.body[0] : null;
if (!approvedRow || approvedRow.status !== 'APPROVED') {
  fail('sop expected APPROVED', sopApproved.body);
}

const pendingV1 = await pgrst(
  `/risk_assessment_worker_repledges?assessment_id=eq.${assessmentId}&worker_user_id=eq.${userId}&required_version=eq.1&pledged_at=is.null&select=id`,
  token
);
assertOk('sop pending repledge v1 select', pendingV1, [200]);
const repledgeV1Id = Array.isArray(pendingV1.body) ? pendingV1.body[0]?.id : null;
if (!repledgeV1Id) fail('sop pending repledge v1 missing', pendingV1.body);
const sopRepledgeV1 = await pgrst('/rpc/complete_risk_assessment_repledge', token, {
  method: 'POST',
  body: JSON.stringify({
    p_repledge_id: repledgeV1Id,
    p_signature: 'data:image/png;base64,smoke-repledge-v1',
  }),
});
assertOk('sop complete repledge v1 rpc', sopRepledgeV1, [200, 204]);

const sopRevise = await pgrst('/rpc/revise_risk_assessment', token, {
  method: 'POST',
  body: JSON.stringify({
    p_assessment_id: assessmentId,
    p_revision_type: 'PERIODIC',
    p_revision_reason: 'domain-smoke periodic revise',
  }),
});
assertOk('sop revise rpc', sopRevise, [200, 204]);

const sopDraftAgain = await pgrst(
  `/risk_assessments?id=eq.${assessmentId}&select=id,status,current_version`,
  token
);
assertOk('sop revised draft select', sopDraftAgain, [200]);
const revisedRow = Array.isArray(sopDraftAgain.body) ? sopDraftAgain.body[0] : null;
if (!revisedRow || revisedRow.status !== 'DRAFT' || revisedRow.current_version < 2) {
  fail('sop expected DRAFT v2+', sopDraftAgain.body);
}

// 재승인 → 재서약 시드 (부서 없음이면 전사 멤버)
const sopResubmit = await pgrst('/rpc/submit_risk_assessment_for_review', token, {
  method: 'POST',
  body: JSON.stringify({
    p_assessment_id: assessmentId,
    p_reviewer_id: reviewerId,
  }),
});
assertOk('sop resubmit after revise rpc', sopResubmit, [200, 204]);

const sopReApproveReview = await pgrst('/rpc/approve_risk_assessment_step', token, {
  method: 'POST',
  body: JSON.stringify({
    p_assessment_id: assessmentId,
    p_step_order: 2,
    p_comment: 'domain-smoke re-review',
    p_signature: 'data:image/png;base64,smoke-review-2',
    p_next_assignee_id: approverId,
  }),
});
assertOk('sop re-approve review rpc', sopReApproveReview, [200, 204]);

const sopReApproveFinal = await pgrst('/rpc/approve_risk_assessment_step', token, {
  method: 'POST',
  body: JSON.stringify({
    p_assessment_id: assessmentId,
    p_step_order: 3,
    p_comment: 'domain-smoke re-final',
    p_signature: 'data:image/png;base64,smoke-approve-2',
    p_next_assignee_id: null,
  }),
});
assertOk('sop re-approve final rpc', sopReApproveFinal, [200, 204]);

const pendingV2 = await pgrst(
  `/risk_assessment_worker_repledges?assessment_id=eq.${assessmentId}&worker_user_id=eq.${userId}&required_version=eq.2&pledged_at=is.null&select=id,required_version`,
  token
);
assertOk('sop pending repledge v2 select', pendingV2, [200]);
const repledgeV2Id = Array.isArray(pendingV2.body) ? pendingV2.body[0]?.id : null;
if (!repledgeV2Id) fail('sop pending repledge v2 missing', pendingV2.body);

const sopRepledgeV2 = await pgrst('/rpc/complete_risk_assessment_repledge', token, {
  method: 'POST',
  body: JSON.stringify({
    p_repledge_id: repledgeV2Id,
    p_signature: 'data:image/png;base64,smoke-repledge-v2',
  }),
});
assertOk('sop complete repledge v2 rpc', sopRepledgeV2, [200, 204]);

await auth('/logout', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});

console.info('domain SoT smoke passed (auth+postgrest+sop lifecycle)');
process.exit(0);
