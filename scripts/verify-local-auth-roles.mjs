/**
 * 역할별 로컬 로그인 API 검증 (Vite /api/local-auth 대상)
 * 사용: node scripts/verify-local-auth-roles.mjs [baseUrl]
 */
import { LOCAL_AUTH_ROLE_ACCOUNTS } from '../server/local-auth/seed.ts';

const base = (
  process.argv[2] ||
  process.env.EP_AUTH_API_BASE ||
  process.env.VITE_AUTH_API_BASE ||
  'http://127.0.0.1:8787'
)
  .replace(/\/$/, '')
  .replace(/\/api\/local-auth$/i, '');

async function login(email, password) {
  const res = await fetch(`${base}/api/local-auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `login ${res.status}`);
  return data;
}

async function memberships(token) {
  const res = await fetch(`${base}/api/local-auth/memberships`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `memberships ${res.status}`);
  return data.memberships ?? [];
}

const results = [];
for (const account of LOCAL_AUTH_ROLE_ACCOUNTS) {
  const emails = [account.email, ...account.aliases.map((a) => a.email)];
  for (const email of emails) {
    try {
      const session = await login(email, account.password);
      const list = await memberships(session.access_token);
      const roles = list.map((m) => m.role);
      const ok = roles.includes(account.role);
      results.push({ email, expected: account.role, roles, ok });
      console.log(ok ? 'OK ' : 'FAIL', email, '->', roles.join(',') || '(none)');
    } catch (err) {
      results.push({ email, expected: account.role, ok: false, error: String(err.message || err) });
      console.log('FAIL', email, err.message || err);
    }
  }
}

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log(`\nAll ${results.length} role logins passed`);
