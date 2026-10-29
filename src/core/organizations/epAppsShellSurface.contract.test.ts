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

function assertNoMobileOnlyBreakpoints(src: string, label: string) {
  assert.doesNotMatch(src, /\blg:hidden\b/, `${label}: lg:hidden 금지`);
  assert.doesNotMatch(src, /\bmd:hidden\b/, `${label}: md:hidden 금지`);
  assert.doesNotMatch(src, /\bsm:hidden\b/, `${label}: sm:hidden 금지`);
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
assert.doesNotMatch(header, /CustomerJoinRequestsPanel|customerJoinService|pendingJoinCount|가입 승인/);
assert.doesNotMatch(header, /canApproveMemberJoins/);
assert.doesNotMatch(header, /학부모|수강|원장/);
assert.doesNotMatch(header, /lg:hidden[\s\S]{0,80}Search|aria-label="검색"/);
// 데스크톱 헤더: 브랜드 + 계정 메뉴 (org name 배지 없음)
assert.doesNotMatch(header, /currentOrganization\.name/);
assert.match(header, /appBrand\.shortName/);
assert.match(header, /내 계정/);
assert.match(header, /조직 설정|\/workspace\/org-admin/);
assert.match(header, /canManageOrgStructure|canManageRoles/);
assertNoMobileOnlyBreakpoints(header, 'Header');

assert.ok(!existsSync(join(root, 'src/core/customer')));
assert.ok(!existsSync(join(root, 'src/components/customer')));

const layout = read('src/components/layout/Layout.tsx');
assert.doesNotMatch(layout, /MobileBottomDock/);
assert.doesNotMatch(layout, /pb-\[max\(5rem/);
assert.doesNotMatch(layout, /\bSidebar\b|<aside/);
assert.ok(!existsSync(join(root, 'src/components/layout/MobileBottomDock.tsx')));
assert.ok(!existsSync(join(root, 'src/shared/components/layout/ModuleBottomNav.tsx')));

const moduleShell = read('src/shared/components/layout/ModuleAppShell.tsx');
assert.match(moduleShell, /sidebar\?:/);
assert.match(moduleShell, /sidebar = null|sidebar\?\? null/);

const industryShell = read('src/app/industry/GenericIndustryShell.tsx');
assert.doesNotMatch(industryShell, /ModuleSidebar/);
assert.doesNotMatch(industryShell, /title: '관리'/);

/** 하위 경로가 있는 사내 앱만 WorkAppShell 사이드바 사용 (글로벌 셸 금지) */
const workAppShell = read('src/shared/components/layout/WorkAppShell.tsx');
assert.match(workAppShell, /data-testid="work-app-shell"/);
assert.match(workAppShell, /사내 업무 앱/);
for (const rel of [
  'src/pages/workspace/WorkspaceShuttlePage.tsx',
  'src/pages/workspace/WorkspaceMealSurveyPage.tsx',
  'src/pages/workspace/WorkspaceOfficeSupplyPage.tsx',
  'src/pages/workspace/WorkspaceVolunteerPage.tsx',
  'src/pages/workspace/RndPortalPage.tsx',
] as const) {
  assert.match(read(rel), /WorkAppShell/, `${rel} must use WorkAppShell`);
}

const orgAdmin = read('src/pages/workspace/OrgAdminHubPage.tsx');
assert.match(orgAdmin, /\/workspace\/organization/);
assert.match(orgAdmin, /\/workspace\/settings\/roles/);
assert.match(orgAdmin, /canManageOrgStructure|canManageRoles/);

const roleSwitcher = read('src/core/organizations/RoleContextSwitcher.tsx');
assert.doesNotMatch(roleSwitcher, /사업장 추가\/선택|clearOrganization/);
assert.doesNotMatch(roleSwitcher, /enterParentPortal|enterCustomerPortal/);
assert.doesNotMatch(roleSwitcher, /학부모 포털|수강생 포털|이용자 포털/);
assert.doesNotMatch(roleSwitcher, /signup\/customer|다른 사업장에 이용 신청/);

const settings = read('src/core/organizations/components/WorkplaceSettingsView.tsx');
assert.doesNotMatch(settings, /기본 수강 형태|월 수강료|AttendanceFeatureToggle|출석 키오스크/);
assert.doesNotMatch(settings, /원장,\s*강사|교재·연주회비/);
assert.match(settings, /대표이사|관리자 권한 위임/);
assert.doesNotMatch(settings, /기본 프로필|CustomTermsSettingCard|OrganizationDangerZoneCard|조직 영구 삭제|계정 탈퇴/);
assert.match(settings, /isPlantOps|personal_plant_ops/);

const account = read('src/core/account/MyAccountView.tsx');
assert.match(account, /PasswordChangeCard/);
assert.match(account, /보유 권한|직급|showPasswordChange/);
assert.doesNotMatch(account, /AccountDeletionCard|계정 탈퇴/);

const app = read('src/App.tsx');
assert.match(app, /path="\/signup\/customer"[\s\S]*?Navigate to="\/workspace"/);
assert.doesNotMatch(app, /CustomerSignUpFlow/);
assert.match(app, /path="\/workspace\/org-admin"/);

const login = read('src/pages/auth/LoginPage.tsx');
assert.doesNotMatch(login, /extra-login-notice-mobile|lg:hidden text-center mb-6/);
assert.match(login, /임직원 로그인|formTitle/);
assert.match(login, /LoginForm/);
assert.doesNotMatch(login, /MobileLoginForm/);
assertNoMobileOnlyBreakpoints(login, 'LoginPage');

const launcher = read('src/pages/workspace/CompanyAppLauncherDashboard.tsx');
assertNoMobileOnlyBreakpoints(launcher, 'CompanyAppLauncherDashboard');
assert.match(launcher, /grid-cols-5/);
assert.doesNotMatch(launcher, /직급·권한|사업장 설정|id: 'settings'|id: 'roles'|id: 'org_settings'/);
assert.doesNotMatch(launcher, /id: 'maintenance'|\/workspace\/maintenance/);
assert.match(launcher, /헤더 계정 메뉴|\/org-admin/);
assert.match(launcher, /\/rnd\/maintenance|연구소 앱/);

const rndPortal = read('src/pages/workspace/RndPortalPage.tsx');
assert.match(rndPortal, /WorkAppShell/);
assert.match(rndPortal, /RndMaintenanceSection/);
assert.match(rndPortal, /maintenance/);

const rndCaps = read('src/pages/workspace/rndPortalCapabilities.ts');
assert.match(rndCaps, /maintenance:\s*['"]\/rnd\/maintenance['"]/);
assert.match(rndCaps, /maintenance:\s*['"]설비 점검['"]/);

const appRoutes = read('src/App.tsx');
assert.match(appRoutes, /path="\/rnd"/);
assert.match(appRoutes, /path="maintenance"/);
assert.match(appRoutes, /\/workspace\/maintenance[\s\S]*?\/rnd\/maintenance/);

console.log('epAppsShellSurface.contract.test.ts: ok');
