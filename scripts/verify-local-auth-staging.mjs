/**
 * 스테이징/사내 Auth API 스모크.
 * env:
 *   EP_AUTH_API_BASE  (예: http://localhost:8787/api/local-auth)
 *   EP_STAGING_EMAIL / EP_STAGING_PASSWORD  (실데이터 fixture)
 * 미설정 시 로컬 개발 계정(owner@ep.local)으로 폴백.
 */
const API_BASE = (
  process.env.EP_AUTH_API_BASE ||
  process.env.VITE_AUTH_API_BASE ||
  'http://127.0.0.1:8787/api/local-auth'
).replace(/\/$/, '');

const email = (process.env.EP_STAGING_EMAIL || 'owner@ep.local').trim().toLowerCase();
const password = process.env.EP_STAGING_PASSWORD || 'EpTest123!';

async function api(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
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

const health = await api('/health');
if (!health.res.ok || !health.body.ok) {
  console.error('health failed', health.body);
  process.exit(1);
}
console.info('health ok', health.body);

const login = await api('/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});
if (!login.res.ok || !login.body.access_token) {
  console.error('login failed', login.body);
  process.exit(1);
}
console.info('login ok', login.body.user?.email);

const token = login.body.access_token;
const session = await api('/session', {
  headers: { Authorization: `Bearer ${token}` },
});
if (!session.body.session?.user?.id) {
  console.error('session failed', session.body);
  process.exit(1);
}
console.info('session ok', session.body.session.user.email);

const memberships = await api('/memberships', {
  headers: { Authorization: `Bearer ${token}` },
});
if (!memberships.res.ok || !Array.isArray(memberships.body.memberships)) {
  console.error('memberships failed', memberships.body);
  process.exit(1);
}
const m0 = memberships.body.memberships[0];
console.info(
  'memberships',
  memberships.body.memberships.length,
  m0
    ? {
        role: m0.role,
        org_role: m0.organization_role_name,
        permissions_keys: Object.keys(m0.permissions || {}).filter((k) => m0.permissions[k]),
        feature_keys: Object.keys(m0.feature_permissions || {}).filter(
          (k) => m0.feature_permissions[k]
        ),
      }
    : null
);

if (m0?.organization_id) {
  const roles = await api(`/organizations/${m0.organization_id}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.info('org roles', roles.res.status, (roles.body.roles || []).map((r) => r.name));
}

await api('/logout', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
console.info('staging smoke passed');
