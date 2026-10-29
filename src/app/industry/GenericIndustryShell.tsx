// @ts-nocheck
import { type FC, type ReactNode, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { CAPABILITY_LIST_VIEWS } from './capabilityListViews';
import {
  Home,
  Settings,
  User,
  Users,
  ArrowRight,
  Building2,
  Sparkles,
  Calendar,
  CheckCircle2,
  Ticket,
  Lock,
  Wallet,
  MessageSquare,
  Package,
  Clock,
  ClipboardList,
  Workflow,
  FileText,
  Award,
  Car,
  Wrench,
  LayoutGrid,
  ShieldAlert,
  FileCheck,
  FolderKanban,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useTabGuard } from '@/shared/navigation/useTabGuard';
import { accountViewEntry, financeViewEntries } from '@/core/industry/commonViewEntries';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { GettingStartedQuestWidget } from '@/app/onboarding/GettingStartedQuestWidget';
import { BusinessHealthWidget } from '@/shared/components/diagnostics';
import { CompanyAppLauncherDashboard } from '@/pages/workspace/CompanyAppLauncherDashboard';

const WorkplaceSettingsView = lazy(() =>
  import('@/core/organizations/components/WorkplaceSettingsView').then((m) => ({ default: m.WorkplaceSettingsView }))
);
const WorkspaceIntranetHubPage = lazy(() =>
  import('@/pages/workspace/WorkspaceIntranetHubPage').then((m) => ({ default: m.WorkspaceIntranetHubPage }))
);
const BookingView = lazy(() =>
  import('@/capabilities/booking/ui/BookingCalendarView').then((m) => ({ default: m.BookingCalendarView }))
);
const SeatRoomView = lazy(() =>
  import('@/capabilities/seat_room').then((m) => ({ default: m.SeatRoomManagementView }))
);
const InventoryView = lazy(() =>
  import('@/capabilities/inventory/components/InventoryManagementView').then((m) => ({
    default: m.InventoryManagementView,
  }))
);
const SafetyConsentView = lazy(() =>
  import('@/capabilities/safety_consent').then((m) => ({ default: m.SafetyConsentManagementView }))
);
const TaskPipelineView = lazy(() =>
  import('@/capabilities/task_pipeline').then((m) => ({ default: m.TaskPipelineKanbanView }))
);
const RentalEquipmentView = lazy(() =>
  import('@/capabilities/rental_equipment').then((m) => ({ default: m.RentalEquipmentManagementView }))
);
const MaintenanceChecklistView = lazy(() =>
  import('@/capabilities/maintenance_checklist').then((m) => ({ default: m.MaintenanceChecklistManagementView }))
);
const RecipeBomView = lazy(() =>
  import('@/capabilities/recipe_bom').then((m) => ({ default: m.RecipeBomManagementView }))
);
const EquipmentLifecycleView = lazy(() =>
  import('@/capabilities/equipment_lifecycle').then((m) => ({ default: m.EquipmentLifecycleManagementView }))
);
const DesktopSopRiskMatrixView = lazy(() =>
  import('@/capabilities/sop_risk_assessment').then((m) => ({ default: m.DesktopSopRiskMatrixView }))
);
const RiskApprovalInboxView = lazy(() =>
  import('@/capabilities/sop_risk_assessment').then((m) => ({ default: m.RiskApprovalInboxView }))
);
const WorkerRepledgeHost = lazy(() =>
  import('@/capabilities/sop_risk_assessment/components/WorkerRepledgeHost').then((m) => ({
    default: m.WorkerRepledgeHost,
  }))
);
const SupplyRestockView = lazy(() =>
  import('@/capabilities/supply_restock').then((m) => ({ default: m.SupplyRestockView }))
);
const FacilityIncidentReportView = lazy(() =>
  import('@/capabilities/facility_incident_report').then((m) => ({ default: m.FacilityIncidentReportView }))
);
const MboManagementView = lazy(() =>
  import('@/capabilities/mbo').then((m) => ({ default: m.MboManagementView }))
);
const ResearchProjectManagementView = lazy(() =>
  import('@/capabilities/research_project').then((m) => ({
    default: m.ResearchProjectManagementView,
  }))
);
const PatentAssetManagementView = lazy(() =>
  import('@/capabilities/patent_ip_asset').then((m) => ({ default: m.PatentAssetManagementView }))
);
const ApprovalWorkflowWithLinkedSync = lazy(() =>
  import('@/pages/workspace/ApprovalWorkflowWithLinkedSync').then((m) => ({
    default: m.ApprovalWorkflowWithLinkedSync,
  }))
);
const UniversalResourceCalendarView = lazy(() =>
  import('@/capabilities/resources').then((m) => ({ default: m.UniversalResourceCalendarView }))
);
const GrievanceListPage = lazy(() =>
  import('@/capabilities/whistleblower_grievance').then((m) => ({ default: m.GrievanceListPage }))
);
const CapabilitySwitchboardView = lazy(() =>
  import('@/pages/settings/CapabilitySwitchboardPage').then((m) => ({ default: m.CapabilitySwitchboardPage }))
);
import { PluginErrorBoundary } from '@/shared/components/PluginErrorBoundary';
import { ToastContainer, ConfirmDialog } from '@/shared/components';
import { ExecutiveRiskDashboardWidget } from '@/shared/components/ExecutiveRiskDashboardWidget';
import { ModuleAppShell } from '@/shared/components/layout/ModuleAppShell';
import { ModuleSidebar } from '@/shared/components/layout/ModuleSidebar';
import { getModuleChrome } from '@/app/industry/moduleChromeRegistry';
import {
  isCorporateChromePreset,
  resolveModuleIndustryId,
} from '@/app/industry/resolveModuleIndustry';
import { SupabaseRoleSync } from '@/SupabaseRoleSync';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getIndustryLabel, shouldUseGenericShell } from '@/core/industry/types';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import type { NavMenuItem, NavMenuSection } from '@/core/auth/navUtils';
import { filterNavSections } from '@/core/auth/navUtils';
import { isNavTabAllowed, normalizeRolePermissions } from '@/domain/permissions';
import { useTerminology } from '@/core/terminology';
import { StorageService } from '@/services/storage';
import {
  TAB_REQUIRED_CAPABILITIES,
  TAB_METADATA,
  getTabMetadata,
  isTabAllowedForCapabilities,
} from './genericIndustryTabs';

export {
  shouldUseGenericShell,
  TAB_REQUIRED_CAPABILITIES,
  TAB_METADATA,
  getTabMetadata,
  isTabAllowedForCapabilities,
};

interface GenericDashboardViewProps {
  onNavigate: (tab: any) => void;
  enabledCaps?: string[];
}

function GenericDashboardView({ onNavigate, enabledCaps = [] }: GenericDashboardViewProps) {
  const { currentOrganization } = useOrganization();
  const { industry } = usePermissions();

  const isCorporatePreset = useMemo(() => {
    const it = currentOrganization?.industry_type || industry;
    return (
      it === 'general_enterprise' ||
      it === 'rnd_lab_management' ||
      it === 'personal_plant_ops' ||
      it === 'corporate_general_affairs' ||
      (enabledCaps.includes('mbo') && enabledCaps.includes('research_project'))
    );
  }, [currentOrganization?.industry_type, industry, enabledCaps]);

  if (isCorporatePreset) {
    return (
      <div className="max-w-5xl mx-auto pt-2 sm:pt-4" data-testid="corporate-launcher-home">
        <CompanyAppLauncherDashboard
          variant="home"
          enabledCapabilityIds={enabledCaps}
        />
      </div>
    );
  }
  const { t } = useTerminology(currentOrganization?.industry_type || industry);

  const customerWord = t('customer.singular', '고객');
  const placeWord = t('place.singular', '사업장');
  const industryLabel = getIndustryLabel(currentOrganization?.industry_type || industry);

  const allCustomers = StorageService.getStudents();
  const activeCustomers = allCustomers.filter((c) => c.status === 'active');

  const showRiskWidget =
    enabledCaps.includes('facility_incident_report') ||
    enabledCaps.includes('sop_risk_assessment') ||
    Boolean((currentOrganization?.settings as any)?.show_risk_dashboard);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-2 sm:pt-4" data-testid="director-home">
      {/* 환영 및 사업장 헤더 */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>{industryLabel}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {currentOrganization?.name || placeWord}
          </h1>
          <p className="text-indigo-100 text-sm max-w-xl">
            {industryLabel} 운영을 위한 범용 워크스페이스입니다. {customerWord} 관리, 일정, 시설 및 설정을 효율적으로 운영해보세요.
          </p>
        </div>
      </div>

      {/* 사업장 맞춤형 첫걸음 퀘스트(Getting Started) 위젯 */}
      <GettingStartedQuestWidget
        onNavigate={onNavigate}
        organizationId={currentOrganization?.id}
        industryType={currentOrganization?.industry_type || industry}
        customerWord={customerWord}
        placeWord={placeWord}
      />

      {/* 업종별 경영 건전성 자동 진단(Business Health Diagnostic) 위젯 */}
      <BusinessHealthWidget
        industryType={currentOrganization?.industry_type || industry}
        diagnosticInput={{
          totalCustomers: allCustomers.length,
          activeCustomers: activeCustomers.length,
          expiringCustomersThisMonth: Math.round(allCustomers.length * 0.15) || 5,
          reEnrolledCustomersThisMonth: Math.round(allCustomers.length * 0.12) || 4,
          inactiveTwoWeeksCount: Math.max(0, allCustomers.length - activeCustomers.length),
        }}
        onNavigate={onNavigate}
      />

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">전체 {customerWord}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{allCustomers.length}명</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">활동 중인 {customerWord}</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{activeCustomers.length}명</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">운영 상태</p>
            <p className="text-2xl font-black text-slate-800 mt-1">정상 운영 중</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 전사 통합 경영 리스크 지수 위젯 (안전사고/위험평가 기능 활성화 시에만 노출) */}
      {showRiskWidget && <ExecutiveRiskDashboardWidget />}

      {/* 빠른 작업 */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">빠른 작업</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{placeWord} 설정</p>
                <p className="text-xs text-slate-500">운영 기본 정보</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

    </div>
  );
}


/** 모듈 미개발 업종 및 신규 업종용 확장형 공통 셸 */
export const GenericIndustryShell: FC<{ viewMap?: Record<string, () => ReactNode>; Overlays?: React.ComponentType | null }> = ({ viewMap: externalViewMap, Overlays }) => {
  const { activeTab, setActiveTab, currentUser } = useApp();
  const { allowedTabs, roleLabel, roleBadge, industry, isOwner } = usePermissions();
  const { currentOrganization, activeCapabilities = [], hiddenCapabilities = [] } = useOrganization();

  const preset = useMemo(() => {
    return getIndustryPreset(currentOrganization?.industry_type || industry);
  }, [currentOrganization?.industry_type, industry]);

  const enabledCaps = useMemo(() => {
    const baseCaps = (preset?.capabilities ?? []) as string[];
    const requiredCaps = new Set<string>((preset?.requiredCapabilities ?? []) as string[]);
    const customAddons = ((currentOrganization?.settings as any)?.custom_addons ?? []) as string[];
    const hiddenSet = new Set<string>(hiddenCapabilities);
    const combined = new Set<string>([...baseCaps, ...activeCapabilities, ...customAddons]);
    return Array.from(combined).filter((cap) => requiredCaps.has(cap) || !hiddenSet.has(cap));
  }, [preset, activeCapabilities, hiddenCapabilities, currentOrganization?.settings]);


  const navSections: NavMenuSection[] = useMemo(() => {
    const items: NavMenuItem[] = [{ tab: 'dashboard', label: '홈', icon: <Home className="w-4 h-4" /> }];

    const hasIntranetSuite =
      enabledCaps.includes('mbo') ||
      enabledCaps.includes('whistleblower_grievance') ||
      enabledCaps.includes('research_project') ||
      enabledCaps.includes('approval_workflow');
    if (hasIntranetSuite) {
      items.splice(1, 0, {
        tab: 'intranet-hub',
        label: '사내 업무',
        icon: <Building2 className="w-4 h-4" />,
      });
    }

    if (enabledCaps.includes('booking') || enabledCaps.includes('seat_room')) {
      items.push({ tab: 'bookings', label: '예약·공간', icon: <Calendar className="w-4 h-4" /> });
      items.push({ tab: 'fleet', label: '공용자원 예약', icon: <Car className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('attendance')) {
      items.push({ tab: 'attendance', label: '출결 관리', icon: <CheckCircle2 className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('passes')) {
      items.push({ tab: 'passes', label: '이용권·회원권', icon: <Ticket className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('locker')) {
      items.push({ tab: 'lockers', label: '사물함·락커', icon: <Lock className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('consultation_crm') || enabledCaps.includes('consultation')) {
      items.push({ tab: 'consultations', label: '상담 내역', icon: <MessageSquare className="w-4 h-4" /> });
    }
    if (
      enabledCaps.includes('billing_invoicing') ||
      enabledCaps.includes('ledger_simple') ||
      enabledCaps.includes('credit_wallet') ||
      enabledCaps.includes('billing')
    ) {
      items.push({ tab: 'finance', label: '수납·정산', icon: <Wallet className="w-4 h-4" /> });
    }

    const extendedItems: NavMenuItem[] = [];
    if (enabledCaps.includes('rental_equipment')) {
      extendedItems.push({ tab: 'rentals', label: '장비 대여', icon: <Clock className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('equipment_lifecycle')) {
      extendedItems.push({ tab: 'equipment-lifecycle', label: '장비 수명주기', icon: <Wrench className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('seat_room')) {
      extendedItems.push({ tab: 'seat-rooms', label: '공간·좌석', icon: <LayoutGrid className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('sop_risk_assessment')) {
      extendedItems.push({ tab: 'sop-risk', label: 'SOP·위험성평가', icon: <ShieldAlert className="w-4 h-4" /> });
      extendedItems.push({ tab: 'risk-approvals', label: '내 결재 대기함', icon: <FileCheck className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('maintenance_checklist')) {
      extendedItems.push({ tab: 'maintenance', label: '시설 점검', icon: <ClipboardList className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('task_pipeline')) {
      extendedItems.push({ tab: 'pipelines', label: '파이프라인', icon: <Workflow className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('safety_consent')) {
      extendedItems.push({ tab: 'consents', label: '안전 동의서', icon: <FileText className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('inventory') || enabledCaps.includes('commerce')) {
      extendedItems.push({ tab: 'inventory', label: '재고·상품', icon: <Package className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('supply_restock')) {
      extendedItems.push({ tab: 'supply-restock', label: '소모품 안전재고', icon: <Package className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('facility_incident_report')) {
      extendedItems.push({ tab: 'facility-incident-report', label: '안전사고·보험대장', icon: <FileText className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('mbo')) {
      extendedItems.push({ tab: 'mbo', label: '목표관리(MBO)', icon: <Award className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('research_project')) {
      extendedItems.push({ tab: 'lab-projects', label: '연구과제', icon: <FolderKanban className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('patent_ip_asset')) {
      extendedItems.push({ tab: 'patent-ip-asset', label: '특허·직무발명', icon: <Sparkles className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('approval_workflow')) {
      extendedItems.push({ tab: 'approval-workflow', label: '전자 결재', icon: <FileText className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('whistleblower_grievance')) {
      extendedItems.push({ tab: 'grievances', label: '노경 건의함', icon: <MessageSquare className="w-4 h-4" /> });
    }

    const sections: NavMenuSection[] = [
      {
        title: '주요 업무',
        items,
      },
    ];

    if (extendedItems.length > 0) {
      sections.push({
        title: '맞춤 운영 도구',
        items: extendedItems,
      });
    }

    sections.push({
      title: '관리',
      items: [
        { tab: 'settings', label: '설정', icon: <Settings className="w-4 h-4" /> },
        { tab: 'account', label: '내 계정', icon: <User className="w-4 h-4" /> },
      ],
    });

    return sections;
  }, [enabledCaps]);

  const mainTabs = useMemo(() => navSections[0].items, [navSections]);

  const filteredSections = useMemo(() => {
    const sections = filterNavSections(navSections, allowedTabs);
    let flags = null;
    try {
      const stored = StorageService.getActiveUser()?.customRole?.permissions;
      flags = normalizeRolePermissions(stored);
    } catch {
      flags = null;
    }
    if (!flags) return sections;
    const member = { role: isOwner ? 'owner' : 'staff', customRole: { permissions: flags } };
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => isNavTabAllowed(item.tab, member)),
      }))
      .filter((section) => section.items.length > 0);
  }, [navSections, allowedTabs, isOwner]);

  useTabGuard();

  const { tab: urlTab } = useParams<{ tab?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  /** EP_apps 등 기업 크롬: 런처 전용 경로와 셸 탭 이중 진입을 합친다 */
  const CORPORATE_DEDICATED_TAB_ROUTES: Record<string, string> = {
    'approval-workflow': '/workspace/approvals',
    'sop-risk': '/workspace/sop-risk',
    'risk-approvals': '/workspace/sop-risk',
    fleet: '/workspace/resources',
    bookings: '/workspace/resources',
    inventory: '/workspace/inventory',
    'supply-restock': '/workspace/supply-restock',
  };

  const navigateCorporateTab = (tab: string) => {
    const industryType = currentOrganization?.industry_type || industry;
    if (isCorporateChromePreset(industryType)) {
      const dedicated = CORPORATE_DEDICATED_TAB_ROUTES[tab];
      if (dedicated) {
        navigate(dedicated);
        return;
      }
    }
    setActiveTab(tab);
  };

  const defaultViewMap: Record<string, () => ReactNode> = {
    dashboard: () => <GenericDashboardView onNavigate={setActiveTab} enabledCaps={enabledCaps} />,
    'intranet-hub': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">사내 허브를 불러오는 중…</div>}>
        <WorkspaceIntranetHubPage enabledCapabilityIds={enabledCaps} />
      </Suspense>
    ),
    'approval-workflow': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">전자 결재를 불러오는 중…</div>}>
        <ApprovalWorkflowWithLinkedSync />
      </Suspense>
    ),
    approvals: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">전자 결재를 불러오는 중…</div>}>
        <ApprovalWorkflowWithLinkedSync />
      </Suspense>
    ),
    bookings: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">예약 화면을 불러오는 중…</div>}>
        <BookingView />
      </Suspense>
    ),
    fleet: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">공용자원 예약을 불러오는 중…</div>}>
        <UniversalResourceCalendarView
          compact
          hideApprovalInbox
          hideMasterButton
          bookingMode="member"
          defaultCategory="vehicle"
        />
      </Suspense>
    ),
    grievances: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">노경 건의함을 불러오는 중…</div>}>
        <GrievanceListPage />
      </Suspense>
    ),
    'seat-rooms': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">공간·좌석 현황을 불러오는 중…</div>}>
        <SeatRoomView />
      </Suspense>
    ),
    'billing-invoices': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">청구서 관리를 불러오는 중…</div>}>
        {financeViewEntries.finance()}
      </Suspense>
    ),
    ledger: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">원장 내역을 불러오는 중…</div>}>
        {financeViewEntries.finance()}
      </Suspense>
    ),
    wallets: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">크레딧 지갑을 불러오는 중…</div>}>
        {financeViewEntries.finance()}
      </Suspense>
    ),
    inventory: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">재고 화면을 불러오는 중…</div>}>
        <InventoryView />
      </Suspense>
    ),
    consents: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">안전 동의서 화면을 불러오는 중…</div>}>
        <SafetyConsentView />
      </Suspense>
    ),
    pipelines: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">작업 파이프라인 화면을 불러오는 중…</div>}>
        <TaskPipelineView />
      </Suspense>
    ),
    rentals: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">장비 대여 화면을 불러오는 중…</div>}>
        <RentalEquipmentView />
      </Suspense>
    ),
    maintenance: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">시설 점검 화면을 불러오는 중…</div>}>
        <MaintenanceChecklistView />
      </Suspense>
    ),
    'recipe-bom': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">레시피 BOM 화면을 불러오는 중…</div>}>
        <RecipeBomView />
      </Suspense>
    ),
    'equipment-lifecycle': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">장비 수명 주기 화면을 불러오는 중…</div>}>
        <EquipmentLifecycleView />
      </Suspense>
    ),
    'sop-risk': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">작업표준 화면을 불러오는 중…</div>}>
        <DesktopSopRiskMatrixView />
      </Suspense>
    ),
    'risk-approvals': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">결재 대기함을 불러오는 중…</div>}>
        <RiskApprovalInboxView />
      </Suspense>
    ),
    'supply-restock': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">소모품 안전재고를 불러오는 중…</div>}>
        <SupplyRestockView />
      </Suspense>
    ),
    'facility-incident-report': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">안전사고 대장 화면을 불러오는 중…</div>}>
        <FacilityIncidentReportView />
      </Suspense>
    ),
    mbo: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">목표관리(MBO) 화면을 불러오는 중…</div>}>
        <MboManagementView />
      </Suspense>
    ),
    'lab-projects': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">연구과제 화면을 불러오는 중…</div>}>
        <ResearchProjectManagementView />
      </Suspense>
    ),
    'research-projects': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">연구과제 화면을 불러오는 중…</div>}>
        <ResearchProjectManagementView />
      </Suspense>
    ),
    'patent-ip-asset': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">특허 및 직무발명 관리 화면을 불러오는 중…</div>}>
        <PatentAssetManagementView />
      </Suspense>
    ),
    capabilities: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">사이드바 메뉴 표시 설정을 불러오는 중…</div>}>
        <CapabilitySwitchboardView />
      </Suspense>
    ),
    'menu-visibility': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">사이드바 메뉴 표시 설정을 불러오는 중…</div>}>
        <CapabilitySwitchboardView />
      </Suspense>
    ),
    ...Object.fromEntries(
      Object.entries(CAPABILITY_LIST_VIEWS).map(([tab, { View }]) => [
        tab,
        () => (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">화면을 불러오는 중…</div>}>
            <View />
          </Suspense>
        ),
      ])
    ),
    ...financeViewEntries,
    settings: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">설정 화면을 불러오는 중…</div>}>
        <WorkplaceSettingsView />
      </Suspense>
    ),
    ...accountViewEntry,
  };

  const viewMap = externalViewMap || defaultViewMap;

  useEffect(() => {
    let candidateTab = urlTab;
    if (!candidateTab) {
      const parts = location.pathname.replace(/^\//, '').split('/');
      if (parts[0] === 'workspace' && parts[1]) {
        candidateTab = parts[1];
      } else if (parts[0] && parts[0] !== 'workspace') {
        candidateTab = parts[0];
      }
    }
    if (candidateTab) {
      setActiveTab(candidateTab);
    }
  }, [urlTab, location.pathname, setActiveTab]);

  const isCurrentTabAllowed = isTabAllowedForCapabilities(activeTab, enabledCaps);

  const renderViewContent = () => {
    const tabMeta = getTabMetadata(activeTab);

    if (!isCurrentTabAllowed) {
      return (
        <div className="max-w-xl mx-auto mt-10 p-6 sm:p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs" data-testid="disabled-feature-notice">
          <div className="w-12 h-12 mx-auto mb-3.5 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold mb-2">
            <span>미활성화 기능</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-800">
            {tabMeta?.label || '현재 업종에서는 제공되지 않는 기능입니다'}
          </h2>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            해당 기능이 활성화되지 않은 업종 프리셋입니다. 필요 시 워크스페이스 설정에서 기능을 추가하세요.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
              대시보드로 돌아가기
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              워크스페이스 설정
            </button>
          </div>
        </div>
      );
    }

    const viewRenderer = viewMap[activeTab];
    if (!viewRenderer) {
      // Capability는 활성화되어 있으나 화면 구현이 Tier 3(화면 연기)인 경우
      if (TAB_REQUIRED_CAPABILITIES[activeTab]) {
        return (
          <div className="max-w-xl mx-auto mt-10 p-6 sm:p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs" data-testid="deferred-feature-notice">
            <div className="w-12 h-12 mx-auto mb-3.5 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/80 text-indigo-700 rounded-full text-xs font-semibold mb-2">
              <span>Tier 3 · 화면 준비 중</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">
              {tabMeta?.label || '화면 준비 중인 기능입니다'}
            </h2>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              {tabMeta?.description ? `${tabMeta.description} — ` : ''}
              해당 기능({activeTab})의 백엔드 도메인 엔진 및 설정 스키마가 정상 활성화되어 있습니다. 전용 화면은 다음 릴리스에서 제공될 예정입니다.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
              >
                대시보드로 돌아가기
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                워크스페이스 설정
              </button>
            </div>
          </div>
        );
      }

      // 정의되지 않은 미등록 탭
      if (activeTab !== 'dashboard') {
        return (
          <div className="max-w-xl mx-auto mt-10 p-6 sm:p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs" data-testid="not-found-notice">
            <div className="w-12 h-12 mx-auto mb-3.5 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-semibold mb-2">
              <span>미등록 경로</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">페이지를 찾을 수 없습니다</h2>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              요청하신 경로({activeTab})는 존재하지 않거나 유효하지 않은 기능입니다.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
              >
                대시보드로 돌아가기
              </button>
            </div>
          </div>
        );
      }

      return viewMap.dashboard ? viewMap.dashboard() : null;
    }

    return viewRenderer();
  };

  const industryKey = currentOrganization?.industry_type || industry;
  const moduleId = resolveModuleIndustryId(industryKey);
  const moduleChrome = externalViewMap && moduleId ? getModuleChrome(moduleId) : null;
  const ChromeSidebar = moduleChrome?.Sidebar;
  const useCorporateChrome = !externalViewMap && isCorporateChromePreset(industryKey);

  const body = (
    <>
      {Overlays && <Overlays />}
      {(enabledCaps.includes('sop_risk_assessment') || enabledCaps.includes('safety_consent')) && (
        <Suspense fallback={null}>
          <WorkerRepledgeHost />
        </Suspense>
      )}
      <PluginErrorBoundary pluginName={activeTab}>
        {renderViewContent()}
      </PluginErrorBoundary>
    </>
  );

  if (moduleChrome && ChromeSidebar) {
    return (
      <ModuleAppShell theme={moduleChrome.theme} omitHeader nested sidebar={<ChromeSidebar />}>
        {body}
      </ModuleAppShell>
    );
  }

  if (useCorporateChrome) {
    return (
      <ModuleAppShell
        theme="indigo"
        omitHeader
        nested
        sidebar={
          <ModuleSidebar
            theme="indigo"
            sections={filteredSections}
            activeTab={activeTab}
            onNavigate={navigateCorporateTab}
            user={{ name: currentUser.name, roleLabel, roleBadge }}
          />
        }
      >
        {body}
      </ModuleAppShell>
    );
  }

  return <div className="max-w-full flex-1 overflow-x-hidden p-5">{body}</div>;
};

