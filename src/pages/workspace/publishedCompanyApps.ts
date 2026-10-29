/**
 * EP_apps 홈 런처에 게시된 사내 앱 카탈로그.
 * CompanyAppLauncherDashboard 타일과 1:1로 유지한다.
 */
export type PublishedCompanyAppId =
  | 'research'
  | 'mbo'
  | 'shuttle'
  | 'resources'
  | 'sop_risk'
  | 'grievances'
  | 'volunteer'
  | 'meal_survey'
  | 'office_supply';

export type PublishedCompanyApp = {
  id: PublishedCompanyAppId;
  label: string;
  /** 런처 진입 경로 */
  path: string;
  /** 게이트에 필요한 capability (하나라도 켜져 있으면 표시) */
  capabilities: readonly string[];
  /** App.tsx / 워크스페이스 진입 페이지 */
  pageRel: string;
  /** 조회·저장 실패를 사용자에게 알리는 UI 소스 (정적 계약용) */
  errorSurfaceRels: readonly string[];
};

export const PUBLISHED_COMPANY_APPS: readonly PublishedCompanyApp[] = [
  {
    id: 'research',
    label: '연구소',
    path: '/rnd',
    capabilities: ['research_project'],
    pageRel: 'src/pages/workspace/RndPortalPage.tsx',
    errorSurfaceRels: [
      'src/capabilities/research_project/hooks/useResearchProjectWorkspace.ts',
    ],
  },
  {
    id: 'mbo',
    label: 'MBO',
    path: '/workspace/mbo',
    capabilities: ['mbo'],
    pageRel: 'src/pages/workspace/WorkspaceMboPage.tsx',
    errorSurfaceRels: [
      'src/capabilities/mbo/ui/MboManagementView.tsx',
      'src/capabilities/mbo/ui/MboPlanApprovalModal.tsx',
    ],
  },
  {
    id: 'shuttle',
    label: '통근 셔틀',
    path: '/workspace/shuttle/my',
    capabilities: ['shuttle_dispatch'],
    pageRel: 'src/pages/workspace/WorkspaceShuttlePage.tsx',
    errorSurfaceRels: [
      'src/capabilities/shuttle_dispatch/ui/ShuttleRoutesPage.tsx',
      'src/capabilities/shuttle_dispatch/ui/ShuttleRegisterView.tsx',
    ],
  },
  {
    id: 'resources',
    label: '공용 자원',
    path: '/workspace/resources',
    capabilities: ['booking', 'seat_room'],
    pageRel: 'src/pages/workspace/WorkspaceResourcesPage.tsx',
    errorSurfaceRels: [
      'src/pages/workspace/WorkspaceResourcesPage.tsx',
      'src/capabilities/resources/ui/SharedVehicleCatalogView.tsx',
      'src/capabilities/resources/ui/ResourceApprovalInboxView.tsx',
    ],
  },
  {
    id: 'sop_risk',
    label: '작업표준·위험성평가',
    path: '/workspace/sop-risk',
    capabilities: ['sop_risk_assessment'],
    pageRel: 'src/pages/workspace/WorkspaceSopRiskPage.tsx',
    errorSurfaceRels: [
      'src/capabilities/sop_risk_assessment/components/SopPendingApprovalStrip.tsx',
      'src/capabilities/sop_risk_assessment/components/ApprovalActionModal.tsx',
    ],
  },
  {
    id: 'grievances',
    label: '노경 건의함',
    path: '/workspace/grievances',
    capabilities: ['whistleblower_grievance'],
    pageRel: 'src/pages/workspace/WorkspaceFeedbacksPage.tsx',
    errorSurfaceRels: [
      'src/capabilities/whistleblower_grievance/components/GrievanceListPage.tsx',
    ],
  },
  {
    id: 'volunteer',
    label: '봉사활동',
    path: '/workspace/volunteer',
    capabilities: ['volunteer_activity'],
    pageRel: 'src/pages/workspace/WorkspaceVolunteerPage.tsx',
    errorSurfaceRels: [
      'src/capabilities/volunteer_activity/ui/VolunteerListView.tsx',
      'src/capabilities/volunteer_activity/ui/VolunteerManagePage.tsx',
    ],
  },
  {
    id: 'meal_survey',
    label: '식수인원 조사',
    path: '/workspace/meal-survey',
    capabilities: ['meal_survey'],
    pageRel: 'src/pages/workspace/WorkspaceMealSurveyPage.tsx',
    errorSurfaceRels: [
      'src/capabilities/meal_survey/ui/MealSurveyMyView.tsx',
      'src/capabilities/meal_survey/ui/MealSurveyManagePage.tsx',
      'src/capabilities/meal_survey/ui/MealSurveySettingsPage.tsx',
    ],
  },
  {
    id: 'office_supply',
    label: '사무용품 취합',
    path: '/workspace/office-supply',
    capabilities: ['office_supply_request'],
    pageRel: 'src/pages/workspace/WorkspaceOfficeSupplyPage.tsx',
    errorSurfaceRels: [
      'src/capabilities/office_supply_request/ui/OfficeSupplyMyView.tsx',
      'src/capabilities/office_supply_request/ui/OfficeSupplyManagePage.tsx',
      'src/capabilities/office_supply_request/ui/OfficeSupplyCatalogPage.tsx',
    ],
  },
] as const;

export function getPublishedCompanyApp(id: PublishedCompanyAppId): PublishedCompanyApp {
  const found = PUBLISHED_COMPANY_APPS.find((app) => app.id === id);
  if (!found) throw new Error(`Unknown published app: ${id}`);
  return found;
}
