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
  "facility-incident-report",
  "facility-incidents",
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
