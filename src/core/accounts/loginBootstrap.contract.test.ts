/**
 * 로그인 부트스트랩 계약: 계정 동기화 순서·게이트 연동
 * 실행: npm run test:login-bootstrap
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fromHere = dirname(fileURLToPath(import.meta.url));

console.log('[test:login-bootstrap] start');

const servicePath = join(fromHere, 'loginBootstrapService.ts');
assert.ok(existsSync(servicePath), 'loginBootstrapService.ts must exist');
const service = readFileSync(servicePath, 'utf8');

assert.match(service, /export async function runLoginAccountSync/);
assert.match(service, /connectStaffOnLogin/);
assert.match(service, /syncAuthProvidersOnLogin/);
assert.match(service, /syncOAuthIdentitiesFromSession/);

const fnStart = service.indexOf('export async function runLoginAccountSync');
assert.ok(fnStart >= 0, 'runLoginAccountSync export must exist');
const fnBody = service.slice(fnStart);
const staffIdx = fnBody.indexOf('await connectStaffOnLogin(');
const providersIdx = fnBody.indexOf('await syncAuthProvidersOnLogin(');
const oauthIdx = fnBody.indexOf('await syncOAuthIdentitiesFromSession(');
assert.ok(staffIdx >= 0, 'must await connectStaffOnLogin');
assert.ok(providersIdx >= 0, 'must await syncAuthProvidersOnLogin');
assert.ok(oauthIdx >= 0, 'must await syncOAuthIdentitiesFromSession');
assert.ok(
  staffIdx < providersIdx && providersIdx < oauthIdx,
  `sync call order expected staff < providers < oauth, got ${staffIdx}, ${providersIdx}, ${oauthIdx}`
);

assert.match(service, /soft-fail/);
const tryCount = (service.match(/try\s*\{/g) ?? []).length;
assert.ok(tryCount >= 3, 'each sync step must be try/catch soft-fail');

const provider = readFileSync(
  join(fromHere, '../organizations/OrganizationProvider.tsx'),
  'utf8'
);
assert.match(provider, /runLoginAccountSync/);

const authProvider = readFileSync(join(fromHere, '../../providers/authProvider.ts'), 'utf8');
assert.match(authProvider, /signIn\(\s*\{\s*email,\s*password/);
assert.match(authProvider, /redirectTo:\s*["']\/["']|redirectTo:\s*["']\/workspace["']/);
assert.doesNotMatch(authProvider, /\/customer\/pass/);

assert.match(authProvider, /success:\s*false/);
assert.match(authProvider, /로그인 세션을 생성하지 못했습니다|Login Error/);

assert.match(authProvider, /redirectTo:\s*["']\/login["']/);
assert.match(authProvider, /authenticated:\s*false/);
assert.match(authProvider, /requestSignOut/);

console.log('loginBootstrap.contract.test.ts: ok');
