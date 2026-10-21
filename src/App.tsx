import React, { useMemo } from "react";
import { Refine, Authenticated } from "@refinedev/core";
import routerBindings, {
  CatchAllNavigate,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Route, Routes, Outlet, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Ticket, Lock } from "lucide-react";

import { InPlaceReAuthModal } from "@/components/auth/InPlaceReAuthModal";
import { installAuthInterceptor } from "@/providers/authInterceptor";
import { AuthProvider } from "@/core/auth/AuthProvider";
import { OrganizationProvider, useOrganization } from "@/core/organizations/OrganizationProvider";
import { AppProvider } from "@/context/AppContext";
import { SupabaseRoleSync } from "@/SupabaseRoleSync";
import { SupabaseAppGate } from "@/SupabaseAppGate";
import { AppBootstrapGate } from "@/core/application/AppBootstrapGate";
import { IndustryAppRouter } from "@/app/industry/IndustryAppRouter";
import { provisionIndustryResources } from "@/app/industry/resourceProvisioner";
import "@/app/presets/presetManualEngine";
import { registerQueryClientClear } from "@/core/auth/services/signOutCoordinator";
import { setTenantQueryClient } from "@/core/query/tenantQueryKeys";

import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { dataProvider } from "./providers/dataProvider";
import { notificationProvider } from "./providers/notificationProvider";
import { createI18nProvider } from "./providers/i18nProvider";
import { liveProvider } from "./providers/liveProvider";
import { ToastContainer, ConfirmDialog, AppErrorBoundary } from "@/shared/components";

import { VehicleShuttleManagementView } from "@/capabilities/vehicle_shuttle/components/VehicleShuttleManagementView";
import { DynamicRoleSettingsPage, FinanceRouteGate } from "@/pages/settings/DynamicRoleSettingsPage";
import { MemberList } from "@/pages/members/MemberList";
import { KioskAttendancePage } from "@/pages/kiosk/KioskAttendancePage";
import { ScheduleCalendarPage } from "@/capabilities/booking/pages/ScheduleCalendarPage";
import { MemberBookingView } from "@/capabilities/booking/pages/MemberBookingView";
import { ConsentSignatureModal } from "@/capabilities/safety_consent/ui/ConsentSignatureModal";
import { Header } from "./components/layout/Header";
import { Layout } from "./components/layout/Layout";
import { DashboardPage } from "./pages/dashboard";
import {
  StudentListPage,
  StudentCreatePage,
  StudentShowPage,
  StudentEditPage,
} from "./pages/students";
import { WeeklyTimetableView } from "@/capabilities/scheduling";
import { TuitionManagementView } from "@/capabilities/billing";
import { LoginPage } from "./pages/auth/LoginPage";
import { ClaimTokenPage } from "./pages/customer/ClaimTokenPage";
import { MyPassView } from "./pages/customer/MyPassView";
import { RolesPage } from "./pages/settings/RolesPage";
import { AcceptStaffInvitePage } from "./pages/invite/AcceptStaffInvitePage";
import { QuickSetupPage } from "./pages/onboarding/QuickSetupPage";
import { OrganizationTreePage } from "./pages/organization/OrganizationTreePage";
import { WorkspaceResourcesPage } from "./pages/workspace/WorkspaceResourcesPage";
import { WorkspaceFeedbacksPage } from "./pages/workspace/WorkspaceFeedbacksPage";
import { RndPortalPage } from "./pages/workspace/RndPortalPage";
import { WorkspaceIntranetHubPage } from "./pages/workspace/WorkspaceIntranetHubPage";
import { WorkspaceMboPage } from "./pages/workspace/WorkspaceMboPage";
import { WorkspaceApprovalsPage } from "./pages/workspace/WorkspaceApprovalsPage";
import {
  WorkspaceShuttleMyPage,
  WorkspaceShuttleRosterPage,
  WorkspaceShuttleRoutesPage,
} from "./pages/workspace/WorkspaceShuttlePage";
import { PassesListPage } from "./pages/passes/list";
import { LockersGridPage } from "./pages/lockers/grid";
import { PublicStoreLandingPage } from "./pages/public/PublicStoreLandingPage";
import { SuperAdminGuard } from "./pages/admin/SuperAdminGuard";
import { SuperAdminTenantsPage } from "./pages/admin/SuperAdminTenantsPage";
import { ImpersonationFloatingBanner } from "./components/layout/ImpersonationFloatingBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

setTenantQueryClient(queryClient);

registerQueryClientClear(() => {
  queryClient.clear();
});

const CAPABILITY_ROUTE_PATHS = [
  // 범주 5대 기본 & A~AV 전체 Capability 엔드포인트
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
  "dispatch",
  "promotions",
  "promotional-deals",
  "turnaround",
  "waitlist",
  "leads",
] as const;

const RefineApp: React.FC = () => {
  const { currentOrganization, activeCapabilities, hiddenCapabilities } = useOrganization();
  const industryType = currentOrganization?.industry_type;

  const currentI18nProvider = useMemo(() => {
    return createI18nProvider({
      defaultIndustry: industryType,
      getIndustry: () => industryType,
    });
  }, [industryType]);

  const resources = useMemo(() => {
    const base = provisionIndustryResources({
      industry: industryType,
      i18n: currentI18nProvider,
      activeCapabilities,
      hiddenCapabilities,
    });
    const existingNames = new Set(base.map((r) => r.name));
    const extra: typeof base = [];
    if (!existingNames.has("passes")) {
      extra.push({
        name: "passes",
        list: "/passes",
        meta: {
          label: "이용권/회원권",
          icon: React.createElement(Ticket, { className: "h-4 w-4" }),
        },
      });
    }
    if (!existingNames.has("lockers")) {
      extra.push({
        name: "lockers",
        list: "/lockers",
        meta: {
          label: "사물함/락커",
          icon: React.createElement(Lock, { className: "h-4 w-4" }),
        },
      });
    }
    return [...base, ...extra];
  }, [industryType, currentI18nProvider, activeCapabilities, hiddenCapabilities]);

  return (
    <Refine
      dataProvider={dataProvider}
      authProvider={authProvider}
      accessControlProvider={accessControlProvider}
      notificationProvider={notificationProvider}
      i18nProvider={currentI18nProvider}
      liveProvider={liveProvider}
      routerProvider={routerBindings}
      resources={resources}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        liveMode: "auto",
      }}
    >
      <Routes>
        <Route
          element={
            <Authenticated
              key="authenticated-routes"
              fallback={<CatchAllNavigate to="/login" />}
            >
              <SupabaseAppGate>
                <Outlet />
              </SupabaseAppGate>
            </Authenticated>
          }
        >
          <Route path="/kiosk/attendance" element={<KioskAttendancePage />} />
          {/* 사업장 업종 메인 워크스페이스 화면 */}
          

          {/* 최고 관리자(개발자) 전용 테넌트 종합 관제 콘솔 */}
          <Route
            path="/admin/tenants"
            element={
              <SuperAdminGuard>
                <SuperAdminTenantsPage />
              </SuperAdminGuard>
            }
          />

          {/* Refine 관리 리소스 레이아웃 */}
          <Route
            element={
              <AppErrorBoundary>
                <div className="flex min-h-[100svh] h-dvh flex-col">
                  <ImpersonationFloatingBanner />
                  <Header />
                  <Layout>
                    <Outlet />
                  </Layout>
                  <ConfirmDialog />
                  <ToastContainer />
                </div>
              </AppErrorBoundary>
            }
          >
            <Route index element={<IndustryAppRouter />} />
            <Route path="/workspace/settings/roles" element={<DynamicRoleSettingsPage />} />
            <Route path="/workspace/members" element={<MemberList />} />
            <Route path="/workspace/organization" element={<OrganizationTreePage />} />
            <Route path="/workspace/intranet" element={<WorkspaceIntranetHubPage />} />
            <Route path="/workspace/resources" element={<WorkspaceResourcesPage />} />
            <Route path="/workspace/feedbacks" element={<WorkspaceFeedbacksPage />} />
            <Route path="/workspace/mbo" element={<WorkspaceMboPage />} />
            <Route path="/workspace/approvals" element={<WorkspaceApprovalsPage />} />
            <Route path="/workspace/shuttle/routes" element={<WorkspaceShuttleRoutesPage />} />
            <Route path="/workspace/shuttle/roster" element={<WorkspaceShuttleRosterPage />} />
            <Route path="/workspace/shuttle/my" element={<WorkspaceShuttleMyPage />} />
            <Route path="/rnd" element={<RndPortalPage />} />
            <Route path="/rnd_workspace" element={<Navigate to="/rnd" replace />} />
            <Route path="/workspace" element={<IndustryAppRouter />} />
            <Route path="/workspace/:tab" element={<IndustryAppRouter />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Roster / Customers 범용 중립 경로 및 하위 호환 /students 경로 */}
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/create" element={<StudentCreatePage />} />
            <Route path="/students/:id" element={<StudentShowPage />} />
            <Route path="/students/:id/edit" element={<StudentEditPage />} />
            <Route path="/customers" element={<StudentListPage />} />
            <Route path="/customers/create" element={<StudentCreatePage />} />
            <Route path="/customers/:id" element={<StudentShowPage />} />
            <Route path="/customers/:id/edit" element={<StudentEditPage />} />
            <Route path="/roster" element={<StudentListPage />} />
            <Route path="/roster/create" element={<StudentCreatePage />} />
            <Route path="/roster/:id" element={<StudentShowPage />} />
            <Route path="/roster/:id/edit" element={<StudentEditPage />} />

            <Route path="/schedules" element={<WeeklyTimetableView />} />
            <Route path="/booking/week" element={<ScheduleCalendarPage />} />
            <Route path="/billing" element={<FinanceRouteGate><TuitionManagementView /></FinanceRouteGate>} />
            <Route path="/customer/pass" element={<><MyPassView /><ConsentSignatureModal /></>} />
            <Route path="/customer/booking" element={<MemberBookingView />} />
            <Route path="/passes" element={<PassesListPage />} />
            <Route path="/lockers" element={<LockersGridPage />} />
            <Route path="/settings/roles" element={<RolesPage />} />
            <Route path="/onboarding/quick" element={<QuickSetupPage />} />
            <Route path="/workspace" element={<IndustryAppRouter />} />
            <Route path="/workspace/*" element={<IndustryAppRouter />} />

            {/* Capability 동적 리소스 경로 선언적 라우트 매핑 (Refine 사이드바 연동) */}
            {CAPABILITY_ROUTE_PATHS.map((path) => (
              <React.Fragment key={path}>
                <Route path={`/${path}`} element={<IndustryAppRouter />} />
                <Route path={`/${path}/*`} element={<IndustryAppRouter />} />
              </React.Fragment>
            ))}
          </Route>
        </Route>

        {import.meta.env.VITE_E2E === "1" ? (
          <Route path="/e2e/shuttle" element={<VehicleShuttleManagementView />} />
        ) : null}
        <Route path="/p/:slug" element={<PublicStoreLandingPage />} />
        <Route path="/claim/:token" element={<ClaimTokenPage />} />
        <Route path="/invite/staff/:token" element={<AcceptStaffInvitePage />} />

        <Route
          element={
            <Authenticated
              key="unauthenticated-routes"
              fallback={<Outlet />}
            >
              <NavigateToResource />
            </Authenticated>
          }
        >
          <Route path="/login" element={<LoginPage />} />
        </Route>
      </Routes>
      <UnsavedChangesNotifier />
    </Refine>
  );
};

export const App: React.FC = () => {
  React.useEffect(() => {
    installAuthInterceptor();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <OrganizationProvider>
            <AppProvider>
              <SupabaseRoleSync />
              <InPlaceReAuthModal />
              <AppBootstrapGate>
                <RefineApp />
              </AppBootstrapGate>
            </AppProvider>
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
