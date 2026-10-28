/**
 * EP_apps 셸 표면 계약: 사업장 선택기·학원 포털·모바일 하단탭·수강료 설정 제거
 * 실행: npm run test:ep-shell-surface
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel: string): string {
  const path = join(root, rel);
  assert.ok(existsSync(path), `missing file: ${rel}`);
  return readFileSync(path, 'utf8');
}

function assertNotContains(src: string, pattern: RegExp, msg: string) {
  assert.equal(pattern.test(src), false, msg);
}

console.log('[test:ep-shell-surface] start');

const gate = read('src/SupabaseAppGate.tsx');
assert.doesNotMatch(gate, /OrganizationSelector/);
assert.doesNotMatch(gate, /ParentPortalUnavailable|CustomerShell|LazyCustomerShell/);
assert.doesNotMatch(gate, /학부모 포털|수강생 포털/);
assert.match(gate, /data-testid="no-organization-membership"/);
assert.match(gate, /소속 사업장이 없습니다/);
assertNotContains(
  gate,
  /parentPortalActive|customerPortalActive|portalMode/,
  'SupabaseAppGate must not branch on parent/customer portal mode'
);

const header = read('src/components/layout/Header.tsx');
assert.doesNotMatch(header, /clearOrganization|사업장 변경|title="사업장 변경"/);
assert.doesNotMatch(header, /enterCustomerPortal|canAccessCustomerPortal|고객 모드/);
assert.doesNotMatch(header, /학부모|수강|원장/);
assert.doesNotMatch(header, /lg:hidden[\s\S]{0,80}Search|aria-label="검색"/);
assert.match(header, /currentOrganization\.name/);

const layout = read('src/components/layout/Layout.tsx');
assert.doesNotMatch(layout, /MobileBottomDock/);
assert.doesNotMatch(layout, /pb-\[max\(5rem/);

const roleSwitcher = read('src/core/organizations/RoleContextSwitcher.tsx');
assert.doesNotMatch(roleSwitcher, /사업장 추가\/선택|clearOrganization/);
assert.doesNotMatch(roleSwitcher, /enterParentPortal|enterCustomerPortal/);
assert.doesNotMatch(roleSwitcher, /학부모 포털|수강생 포털|이용자 포털/);
assert.doesNotMatch(roleSwitcher, /signup\/customer|다른 사업장에 이용 신청/);

const settings = read('src/core/organizations/components/WorkplaceSettingsView.tsx');
assert.doesNotMatch(settings, /기본 수강 형태|월 수강료|AttendanceFeatureToggle|출석 키오스크/);
assert.doesNotMatch(settings, /원장,\s*강사|교재·연주회비/);
assert.match(settings, /대표, 팀장, 실무자/);

const terms = read('src/pages/settings/CustomTermsSettingCard.tsx');
assert.doesNotMatch(terms, /예:\s*원생|예:\s*수강권|학원,/);
assert.match(terms, /운영자|임직원|회의실|작업자/);

const app = read('src/App.tsx');
assert.match(app, /path="\/signup\/customer"[\s\S]*?Navigate to="\/workspace"/);
assert.doesNotMatch(app, /CustomerSignUpFlow/);

const login = read('src/pages/auth/LoginPage.tsx');
assert.doesNotMatch(login, /extra-login-notice-mobile|lg:hidden text-center mb-6/);
assert.match(login, /임직원 로그인|formTitle/);
assert.match(login, /MobileLoginForm/);

const danger = read('src/core/organizations/components/OrganizationSettingsCards.tsx');
assert.doesNotMatch(danger, /출결,/);

console.log('epAppsShellSurface.contract.test.ts: ok');
