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
const mbo = await pgrst('/mbo_objectives', token, {
  method: 'POST',
  body: JSON.stringify({
    organization_id: orgId,
    owner_name: 'smoke',
    title: 'domain-smoke-mbo',
    start_date: today,
    target_date: today,
    status: 'draft',
  }),
});
assertOk('mbo insert', mbo, [200, 201]);

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
