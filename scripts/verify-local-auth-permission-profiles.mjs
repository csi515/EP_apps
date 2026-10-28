/**
 * 프리셋 직급 + 직무 기능 권한 계정 전부 로그인·권한 검증
 * 사용: npx tsx scripts/verify-local-auth-permission-profiles.mjs [baseUrl]
 */
import { LOCAL_PERMISSION_PROFILES } from '../server/local-auth/permissionProfiles.ts';
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

function effectiveFlags(membership) {
  const perms = membership.permissions || {};
  const features = membership.feature_permissions || {};
  return { ...perms, ...features };
}

const results = [];

console.log('--- MemberRole 기본 계정 ---');
for (const account of LOCAL_AUTH_ROLE_ACCOUNTS) {
  const emails = [account.email, ...account.aliases.map((a) => a.email)];
  for (const email of emails) {
    try {
      const session = await login(email, account.password);
      const list = await memberships(session.access_token);
      const m = list[0];
      const ok = m?.role === account.role;
      results.push({ kind: 'memberRole', email, ok, detail: m?.role });
      console.log(ok ? 'OK ' : 'FAIL', email, 'role=', m?.role);
    } catch (err) {
      results.push({ kind: 'memberRole', email, ok: false, detail: String(err.message || err) });
      console.log('FAIL', email, err.message || err);
    }
  }
}

console.log('\n--- 직급·직무·템플릿 프로파일 ---');
for (const profile of LOCAL_PERMISSION_PROFILES) {
  try {
    const session = await login(profile.email, profile.password);
    const list = await memberships(session.access_token);
    const m = list[0];
    if (!m) throw new Error('no membership');
    const flags = effectiveFlags(m);
    const missing = profile.expectTrue.filter((key) => !flags[key]);
    const roleNameOk =
      !profile.orgRoleName || m.organization_role_name === profile.orgRoleName;
    const ok = missing.length === 0 && roleNameOk && m.role === profile.memberRole;
    results.push({
      kind: 'profile',
      email: profile.email,
      slug: profile.slug,
      ok,
      missing,
      roleName: m.organization_role_name,
      memberRole: m.role,
    });
    console.log(
      ok ? 'OK ' : 'FAIL',
      profile.slug.padEnd(16),
      profile.email.padEnd(22),
      ok
        ? `role=${m.role} orgRole=${m.organization_role_name || '-'} features=${JSON.stringify(m.feature_permissions || {})}`
        : `missing=${missing.join(',') || '-'} roleNameOk=${roleNameOk} gotRole=${m.role}`
    );
  } catch (err) {
    results.push({
      kind: 'profile',
      email: profile.email,
      slug: profile.slug,
      ok: false,
      detail: String(err.message || err),
    });
    console.log('FAIL', profile.slug, profile.email, err.message || err);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.error(failed);
  process.exit(1);
}
