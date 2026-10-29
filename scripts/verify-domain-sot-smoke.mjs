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
const email = (process.env.EP_STAGING_EMAIL || 'owner@ep.local').trim().toLowerCase();
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

const inv = await pgrst('/inventory_items', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    name: 'domain-smoke-item',
    quantity: 1,
  }),
});
assertOk('inventory insert', inv, [200, 201]);

const gr = await pgrst('/anonymous_grievances?select=id&limit=1', token);
assertOk('grievances list', gr, [200]);

const invList = await pgrst(
  `/inventory_items?organization_id=eq.${orgId}&name=eq.domain-smoke-item&select=id,name`,
  token
);
assertOk('inventory select', invList, [200]);
if (!Array.isArray(invList.body) || invList.body.length < 1) {
  fail('inventory select empty', invList.body);
}

await auth('/logout', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});

console.info('domain SoT smoke passed (auth+postgrest required)');
process.exit(0);
