// @ts-nocheck
import React, { lazy, Suspense, useMemo } from "react";
import { Refine, Authenticated } from "@refinedev/core";
import routerBindings, {
  CatchAllNavigate,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Route, Routes, Outlet, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { InPlaceReAuthModal } from "@/components/auth/InPlaceReAuthModal";
import { installAuthInterceptor } from "@/providers/authInterceptor";
import { AuthProvider } from "@/core/auth/AuthProvider";
import { OrganizationProvider, useOrganization } from "@/core/organizations/OrganizationProvider";
import { AppProvider } from "@/context/AppContext";
import { SupabaseRoleSync } from "@/SupabaseRoleSync";
import { SupabaseAppGate } from "@/SupabaseAppGate";
import { AppBootstrapGate } from "@/core/application/AppBootstrapGate";
import { provisionIndustryResources } from "@/app/industry/resourceProvisioner";
import "@/app/presets/presetManualEngine";
import { registerQueryClientClear } from "@/core/auth/services/signOutCoordinator";
import { setTenantQueryClient } from "@/core/query/tenantQueryKeys";
import { setupStorageToQueryBridge } from "@/core/query/crossCacheBridge";
import { getStoredOrganizationId } from "@/core/organizations/services/organizationService";

import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { dataProvider } from "./providers/dataProvider";
import { notificationProvider } from "./providers/notificationProvider";
import { createI18nProvider } from "./providers/i18nProvider";
import { liveProvider } from "./providers/liveProvider";
import { ToastContainer, ConfirmDialog, AppErrorBoundary } from "@/shared/components";
import { LoadingScreen } from "@/shared/components/LoadingScreen";

import { DynamicRoleSettingsPage } from "@/pages/settings/DynamicRoleSettingsPage";
import { Header } from "./components/layout/Header";
import { Layout } from "./components/layout/Layout";
import { LoginPage } from "./pages/auth/LoginPage";
import { AuthPage } from "./core/auth/AuthPage";
import { SuperAdminGuard } from "./pages/admin/SuperAdminGuard";
import { ImpersonationFloatingBanner } from "./components/layout/ImpersonationFloatingBanner";

/** 워크스페이스 셸은 로그인 입구와 분리해 지연 로드 (미이관 학원 모듈 import 차단) */
const IndustryAppRouter = lazy(() =>
  import("@/app/industry/IndustryAppRouter").then((m) => ({ default: m.IndustryAppRouter }))
);
const MemberList = lazy(() => import("@/pages/members/MemberList").then((m) => ({ default: m.MemberList })));
const ScheduleCalendarPage = lazy(() => import("@/capabilities/booking/pages/ScheduleCalendarPage").then((m) => ({ default: m.ScheduleCalendarPage })));
const RolesPage = lazy(() => import("./pages/settings/RolesPage").then((m) => ({ default: m.RolesPage })));
const AcceptStaffInvitePage = lazy(() => import("./pages/invite/AcceptStaffInvitePage").then((m) => ({ default: m.AcceptStaffInvitePage })));
const OrganizationTreePage = lazy(() => import("./pages/organization/OrganizationTreePage").then((m) => ({ default: m.OrganizationTreePage })));
const OrgAdminHubPage = lazy(() => import("./pages/workspace/OrgAdminHubPage").then((m) => ({ default: m.OrgAdminHubPage })));
const WorkspaceResourcesPage = lazy(() => import("./pages/workspace/WorkspaceResourcesPage").then((m) => ({ default: m.WorkspaceResourcesPage })));
const WorkspaceFeedbacksPage = lazy(() => import("./pages/workspace/WorkspaceFeedbacksPage").then((m) => ({ default: m.WorkspaceFeedbacksPage })));
const RndPortalPage = lazy(() => import("./pages/workspace/RndPortalPage").then((m) => ({ default: m.RndPortalPage })));
const RndProjectsSection = lazy(() =>
  import("./pages/workspace/RndPortalPage").then((m) => ({ default: m.RndProjectsSection })),
);
const RndEquipmentSection = lazy(() =>
  import("./pages/workspace/RndPortalPage").then((m) => ({ default: m.RndEquipmentSection })),
);
const RndMaintenanceSection = lazy(() =>
  import("./pages/workspace/RndPortalPage").then((m) => ({ default: m.RndMaintenanceSection })),
);
const RndPatentsSection = lazy(() =>
  import("./pages/workspace/RndPortalPage").then((m) => ({ default: m.RndPatentsSection })),
);
const WorkspaceIntranetHubPage = lazy(() => import("./pages/workspace/WorkspaceIntranetHubPage").then((m) => ({ default: m.WorkspaceIntranetHubPage })));
const WorkspaceMboPage = lazy(() => import("./pages/workspace/WorkspaceMboPage").then((m) => ({ default: m.WorkspaceMboPage })));
const WorkspaceApprovalsPage = lazy(() => import("./pages/workspace/WorkspaceApprovalsPage").then((m) => ({ default: m.WorkspaceApprovalsPage })));
const WorkspaceInventoryPage = lazy(() => import("./pages/workspace/WorkspaceInventoryPage").then((m) => ({ default: m.WorkspaceInventoryPage })));
const WorkspaceSupplyRestockPage = lazy(() => import("./pages/workspace/WorkspaceSupplyRestockPage").then((m) => ({ default: m.WorkspaceSupplyRestockPage })));
const WorkspaceSopRiskPage = lazy(() => import("./pages/workspace/WorkspaceSopRiskPage").then((m) => ({ default: m.WorkspaceSopRiskPage })));
const WorkspaceShuttleMyPage = lazy(() => import("./pages/workspace/WorkspaceShuttlePage").then((m) => ({ default: m.WorkspaceShuttleMyPage })));
const WorkspaceShuttleRosterPage = lazy(() => import("./pages/workspace/WorkspaceShuttlePage").then((m) => ({ default: m.WorkspaceShuttleRosterPage })));
const WorkspaceShuttleRoutesPage = lazy(() => import("./pages/workspace/WorkspaceShuttlePage").then((m) => ({ default: m.WorkspaceShuttleRoutesPage })));
const WorkspaceVolunteerListPage = lazy(() => import("./pages/workspace/WorkspaceVolunteerPage").then((m) => ({ default: m.WorkspaceVolunteerListPage })));
const WorkspaceVolunteerManagePage = lazy(() => import("./pages/workspace/WorkspaceVolunteerPage").then((m) => ({ default: m.WorkspaceVolunteerManagePage })));
const WorkspaceMealSurveyMyPage = lazy(() => import("./pages/workspace/WorkspaceMealSurveyPage").then((m) => ({ default: m.WorkspaceMealSurveyMyPage })));
const WorkspaceMealSurveyManagePage = lazy(() => import("./pages/workspace/WorkspaceMealSurveyPage").then((m) => ({ default: m.WorkspaceMealSurveyManagePage })));
const WorkspaceMealSurveySettingsPage = lazy(() => import("./pages/workspace/WorkspaceMealSurveyPage").then((m) => ({ default: m.WorkspaceMealSurveySettingsPage })));
const WorkspaceOfficeSupplyMyPage = lazy(() => import("./pages/workspace/WorkspaceOfficeSupplyPage").then((m) => ({ default: m.WorkspaceOfficeSupplyMyPage })));
const WorkspaceOfficeSupplyManagePage = lazy(() => import("./pages/workspace/WorkspaceOfficeSupplyPage").then((m) => ({ default: m.WorkspaceOfficeSupplyManagePage })));
const WorkspaceOfficeSupplyCatalogPage = lazy(() => import("./pages/workspace/WorkspaceOfficeSupplyPage").then((m) => ({ default: m.WorkspaceOfficeSupplyCatalogPage })));
const WorkspaceHazardousSubstancesPage = lazy(() => import("./pages/workspace/WorkspaceHazardousSubstancesPage").then((m) => ({ default: m.WorkspaceHazardousSubstancesPage })));
const WorkspaceVehicleMileagePage = lazy(() => import("./pages/workspace/WorkspaceVehicleMileagePage").then((m) => ({ default: m.WorkspaceVehicleMileagePage })));
const EpZeroSetupWizard = lazy(() => import("./pages/onboarding/EpZeroSetupWizard").then((m) => ({ default: m.EpZeroSetupWizard })));
const WorkspaceSafetyPermitsPage = lazy(() => import("./pages/workspace/WorkspaceSafetyPermitsPage").then((m) => ({ default: m.WorkspaceSafetyPermitsPage })));
const WeeklyTimetableView = lazy(() =>
  import("@/capabilities/scheduling/components/timetable/WeeklyTimetableView").then((m) => ({
    default: m.WeeklyTimetableView,
  }))
);
const SuperAdminTenantsPage = lazy(() => import("./pages/admin/SuperAdminTenantsPage").then((m) => ({ default: m.SuperAdminTenantsPage })));
const LegalPageView = lazy(() => import("@/core/legal").then((m) => ({ default: m.LegalPageView })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

setTenantQueryClient(queryClient);
setupStorageToQueryBridge(queryClient, () => getStoredOrganizationId());

registerQueryClientClear(() => {
  queryClient.clear();
});

/** EP personal_plant_ops 제품 경로만 등록 (Moa/학원 라우트 제외) */
const CAPABILITY_ROUTE_PATHS = [
  "bookings",
  "seat-rooms",
  "rentals",
  "maintenance",
  "pipelines",
  "consents",
  "inventory",
  "supply-restock",
  "mbo",
  "mbo-objectives",
  "mbo-projects",
  "approvals",
  "approval-workflow",
  "patents",
  "patent-inventors",
  "research-projects",
  "research-project-gates",
  "research-project-deliverables",
  "whistleblower-grievances",
  "grievances",
  "hazardous-substances",
  "chemical-usage-logs",
  "sop-risk",
  "risk-approvals",
  "recipe-bom",
  "equipment-lifecycle",
  "fleet",
  "intranet-hub",
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
    return provisionIndustryResources({
      industry: industryType,
      i18n: currentI18nProvider,
      activeCapabilities,
      hiddenCapabilities,
    });
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
      <Suspense fallback={<LoadingScreen />}>
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
          <Route
            path="/admin/tenants"
            element={
              <SuperAdminGuard>
                <SuperAdminTenantsPage />
              </SuperAdminGuard>
            }
          />

          <Route
            element={
              <AppErrorBoundary>
                <div className="flex h-dvh min-h-[100svh] flex-col">
                  <ImpersonationFloatingBanner />
                  <Header />
                  <div className="flex min-h-0 flex-1 flex-col">
                    <Layout>
                      <Suspense fallback={<LoadingScreen message="화면을 불러오는 중..." />}>
                        <Outlet />
                      </Suspense>
                    </Layout>
                  </div>
                  <ConfirmDialog />
                  <ToastContainer />
                </div>
              </AppErrorBoundary>
            }
          >
            <Route index element={<IndustryAppRouter />} />
            <Route path="/workspace/settings/roles" element={<DynamicRoleSettingsPage />} />
            <Route path="/workspace/org-admin" element={<OrgAdminHubPage />} />
            <Route path="/workspace/members" element={<MemberList />} />
            <Route path="/workspace/organization" element={<OrganizationTreePage />} />
            <Route path="/workspace/intranet" element={<WorkspaceIntranetHubPage />} />
            <Route path="/workspace/resources" element={<WorkspaceResourcesPage />} />
            <Route path="/workspace/feedbacks" element={<WorkspaceFeedbacksPage />} />
            <Route path="/workspace/grievances" element={<WorkspaceFeedbacksPage />} />
            <Route path="/workspace/mbo" element={<WorkspaceMboPage />} />
            <Route path="/workspace/approvals" element={<WorkspaceApprovalsPage />} />
            <Route path="/workspace/inventory" element={<WorkspaceInventoryPage />} />
            <Route path="/workspace/supply-restock" element={<WorkspaceSupplyRestockPage />} />
            <Route path="/workspace/shuttle/routes" element={<WorkspaceShuttleRoutesPage />} />
            <Route path="/workspace/shuttle/roster" element={<WorkspaceShuttleRosterPage />} />
            <Route path="/workspace/shuttle/my" element={<WorkspaceShuttleMyPage />} />
            <Route path="/workspace/sop-risk" element={<WorkspaceSopRiskPage />} />
            <Route path="/workspace/volunteer" element={<WorkspaceVolunteerListPage />} />
            <Route path="/workspace/volunteer/manage" element={<WorkspaceVolunteerManagePage />} />
            <Route path="/workspace/meal-survey" element={<WorkspaceMealSurveyMyPage />} />
            <Route path="/workspace/meal-survey/manage" element={<WorkspaceMealSurveyManagePage />} />
            <Route path="/workspace/meal-survey/settings" element={<WorkspaceMealSurveySettingsPage />} />
            <Route path="/workspace/office-supply" element={<WorkspaceOfficeSupplyMyPage />} />
            <Route path="/workspace/office-supply/manage" element={<WorkspaceOfficeSupplyManagePage />} />
            <Route path="/workspace/office-supply/catalog" element={<WorkspaceOfficeSupplyCatalogPage />} />
            <Route path="/workspace/hazardous-substances" element={<WorkspaceHazardousSubstancesPage />} />
            <Route path="/workspace/vehicle-mileage" element={<WorkspaceVehicleMileagePage />} />
            <Route path="/workspace/safety-permits" element={<WorkspaceSafetyPermitsPage />} />
            <Route path="/workspace/setup-wizard" element={<EpZeroSetupWizard />} />
            <Route path="/onboarding/ep-setup" element={<EpZeroSetupWizard />} />
            <Route path="/onboarding/quick" element={<Navigate to="/onboarding/ep-setup" replace />} />
            <Route path="/workspace/maintenance" element={<Navigate to="/rnd/maintenance" replace />} />
            <Route path="/rnd" element={<RndPortalPage />}>
              <Route index element={<Navigate to="projects" replace />} />
              <Route path="projects" element={<RndProjectsSection />} />
              <Route path="equipment" element={<RndEquipmentSection />} />
              <Route path="maintenance" element={<RndMaintenanceSection />} />
              <Route path="patents" element={<RndPatentsSection />} />
            </Route>
            <Route path="/rnd_workspace" element={<Navigate to="/rnd" replace />} />
            <Route path="/workspace" element={<IndustryAppRouter />} />
            <Route path="/workspace/:tab" element={<IndustryAppRouter />} />
            <Route path="/dashboard" element={<Navigate to="/workspace" replace />} />
            <Route path="/students" element={<Navigate to="/workspace" replace />} />
            <Route path="/students/*" element={<Navigate to="/workspace" replace />} />
            <Route path="/customers" element={<Navigate to="/workspace" replace />} />
            <Route path="/customers/*" element={<Navigate to="/workspace" replace />} />
            <Route path="/roster" element={<Navigate to="/workspace" replace />} />
            <Route path="/roster/*" element={<Navigate to="/workspace" replace />} />
            <Route path="/passes" element={<Navigate to="/workspace" replace />} />
            <Route path="/lockers" element={<Navigate to="/workspace" replace />} />
            <Route path="/billing" element={<Navigate to="/workspace" replace />} />
            <Route path="/kiosk/attendance" element={<Navigate to="/workspace" replace />} />

            <Route path="/schedules" element={<WeeklyTimetableView />} />
            <Route path="/booking/week" element={<ScheduleCalendarPage />} />
            <Route path="/customer/booking" element={<Navigate to="/workspace" replace />} />
            <Route path="/settings/roles" element={<RolesPage />} />
            <Route path="/workspace/*" element={<IndustryAppRouter />} />

            {CAPABILITY_ROUTE_PATHS.map((path) => (
              <React.Fragment key={path}>
                <Route path={`/${path}`} element={<IndustryAppRouter />} />
                <Route path={`/${path}/*`} element={<IndustryAppRouter />} />
              </React.Fragment>
            ))}
          </Route>
        </Route>

        <Route path="/invite/staff/:token" element={<AcceptStaffInvitePage />} />
        <Route path="/signup/customer" element={<Navigate to="/workspace" replace />} />
        <Route path="/terms" element={<LegalPageView page="terms" />} />
        <Route path="/privacy" element={<LegalPageView page="privacy" />} />
        <Route path="/support" element={<LegalPageView page="support" />} />

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
          <Route path="/signup" element={<AuthPage />} />
        </Route>
      </Routes>
      </Suspense>
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
