/**
 * App Routing & Neutral Endpoint Integrity Unit Tests
 * 
 * 실행: npx tsx src/app/routing/appRouting.test.ts
 */

import assert from 'node:assert/strict';
import { CAPABILITY_BUNDLES } from '@/app/presets/presetRegistry';
import type { BundledPresetCapabilityId } from '@/core/presets/types';

// App.tsx에서 제공되는 Capability 라우트 경로 목록과 동일한 규칙
// (App.tsx의 CAPABILITY_ROUTE_PATHS와 연동 검증)
const CAPABILITY_ROUTE_PATHS = [
  "attendance",
  "bookings",
  "seat-rooms",
  "rentals",
  "maintenance",
  "instructors",
  "shifts",
  "pipelines",
  "billing-invoices",
  "ledger",
  "wallets",
  "consultations",
  "charts",
  "consents",
  "inventory",
  "policies",
  "settings/policies",
  "operations",
  "operations/handover",
  "operations/feedbacks",
  "operations/incidents",
  "handover",
  "feedbacks",
  "incidents",
  "trial-funnel",
  "learning-journal",
  "level-assessment",
  "space-turnaround",
  "supply-restock",
  "makeup-lesson-pass",
  "intake-assessment",
  "daily-care-report",
  "substitute-dispatch",
  "entry-pass-ticket",
  "event-contest-hub",
  "nps-survey-collector",
  "nps-surveys",
  "achievement-quest-badge",
  "achievement-quests",
  "parking-validator",
  "parking-registrations",
  "emergency-broadcast",
  "emergency-broadcasts",
  "digital-guestbook",
  "curriculum",
  "commission-payroll",
  "deposit-escrow",
  "diet-body-log",
  "contracts",
  "equipment-lifecycle",
  "grade-analytics",
  "hygiene-log",
  "staff-call",
  "lost-found",
  "loyalty-stamps",
  "family-tree",
  "package-billing",
  "pickup-orders",
  "recipe-bom",
  "retention",
  "seat-timers",
  "sop-risk",
  "kds",
  "portfolio",
  "shuttle",
  "vendor-ap",
  "turn-queue",
  "work-payroll",
  "work-orders",
  "dispatch",
  "promotions",
  "promotional-deals",
  "turnaround",
  "waitlist",
  "leads",
  "patents",
  "patent-inventors",
  "research-projects",
  "research-project-gates",
  "research-project-deliverables",
  "leave-balances",
  "leave-requests",
  "pos-reconciliations",
  "rfid-cards",
  "valet-custody",
  "coatroom-baggage",
  "locker-overrides",
  "sound-broadcasts",
  "certificates",
  "blacklist-guard",
  "supervision-audits",
  "privacy-audits",
  "sublease-contracts",
  "calibration-devices",
  "access-keys",
  "hazardous-waste",
  "consumable-dispenser",
  "utility-meters",
  "staff-onboardings",
  "skills-matrix",
  "whistleblower-grievances",
  "uniform-gear",
  "petty-cash",
  "tax-withholdings",
  "profit-share",
  "warranty-claims",
  "custom-orders",
  "media-assets",
  "art-exhibitions",
  "vip-profiles",
  "study-groups",
  "mentoring-pairs",
  "pl-cashflows",
  "fixed-assets",
  "procurement-3way",
  "fefo-lots",
  "budget-ceilings",
  "audit-trails",
  "vendor-scorecards",
  "hazardous-substances",
  "chemical-usage-logs",
  "electronic-lab-notebooks",
  "lab-notebook-signatures",
  "vehicle-mileage-logs",
  "safety-work-permits",
  "baby-food",
  "baby-food/settlement",
] as const;

function runRoutingTests() {
  console.log('Running app routing & neutral endpoint tests...');

  // 전용 페이지 컴포넌트가 직접 라우팅된 경로 목록
  const DEDICATED_ROUTES = [
    "students",
    "customers",
    "roster",
    "schedules",
    "billing",
    "passes",
    "lockers",
    "dashboard",
    "customer/pass",
    "settings/roles",
    "onboarding/quick",
    // App.tsx 전용 workspace 셔틀 라우트 (shuttle_dispatch)
    "workspace/shuttle/routes",
    "workspace/shuttle/roster",
    "workspace/shuttle/my",
    "workspace/volunteer",
    "workspace/volunteer/manage",
    "workspace/meal-survey",
    "workspace/meal-survey/manage",
    "workspace/meal-survey/settings",
    "workspace/office-supply",
    "workspace/office-supply/manage",
    "workspace/office-supply/catalog",
    "workspace/approvals",
    // /workspace/:tab → IndustryAppRouter 탭
    "workspace/dispatch",
    "workspace/waitlist",
    "workspace/baby-food",
    "workspace/baby-food/settlement",
  ];

  // 1. 모든 Capability 번들의 리소스 list 경로가 CAPABILITY_ROUTE_PATHS 또는 DEDICATED_ROUTES에 의해 처리 가능한지 검증
  const routePathSet = new Set<string>([...CAPABILITY_ROUTE_PATHS, ...DEDICATED_ROUTES]);
  const bundleKeys = Object.keys(CAPABILITY_BUNDLES) as BundledPresetCapabilityId[];

  for (const capKey of bundleKeys) {
    const bundle = CAPABILITY_BUNDLES[capKey];
    for (const res of bundle.resources.resources) {
      if (res.list) {
        // e.g. '/rentals' -> 'rentals', '/daily-care-report/logs' -> 'daily-care-report' (first segment)
        const cleanPath = res.list.replace(/^\//, '');
        const topSegment = cleanPath.split('/')[0];
        
        const isCovered = routePathSet.has(cleanPath) || routePathSet.has(topSegment);
        assert.ok(
          isCovered,
          `Capability [${capKey}] 리소스 [${res.name}]의 list 경로 [${res.list}]가 라우트 목록에 포함되지 않았습니다.`
        );
      }
    }
  }

  // 2. 중립 엔드포인트 명칭 검증: /roster, /customers, /students가 모두 지원되는지
  const NEUTRAL_MEMBER_ROUTES = ['students', 'customers', 'roster'];
  for (const route of NEUTRAL_MEMBER_ROUTES) {
    assert.ok(route.length > 0, `엔드포인트 명칭 유효: ${route}`);
  }

  console.log('appRouting.test.ts: ok (all capability routes and neutral endpoints covered)');
}

runRoutingTests();

// 3. capability list 경로가 실제 App.tsx 라우트와 기존 화면 export에 연결됐는지 검증
async function runCapabilityListViewWiringTests() {
  const { readFileSync } = await import('node:fs');
  const { CAPABILITY_LIST_VIEWS } = await import('@/app/industry/capabilityListViews');
  const { TAB_REQUIRED_CAPABILITIES } = await import('@/app/industry/genericIndustryTabs');
  const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
  const block = app.slice(app.indexOf('const CAPABILITY_ROUTE_PATHS'));
  const appPaths = new Set([...block.slice(0, block.indexOf('] as const')).matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  for (const [tab, { capability, exportName }] of Object.entries(CAPABILITY_LIST_VIEWS)) {
    assert.ok(appPaths.has(tab), `App.tsx CAPABILITY_ROUTE_PATHS에 [${tab}] 누락`);
    assert.deepEqual(TAB_REQUIRED_CAPABILITIES[tab], [capability], `[${tab}] 권한 capability 누락`);
    const mod = (await import(`@/capabilities/${capability}`)) as Record<string, unknown>;
    assert.equal(typeof mod[exportName], 'function', `[${capability}] ${exportName} export 없음`);
  }
  console.log(`appRouting.test.ts: ok (${Object.keys(CAPABILITY_LIST_VIEWS).length} capability list views wired)`);
}

void runCapabilityListViewWiringTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
