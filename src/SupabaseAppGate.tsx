import React, { Suspense, lazy, useCallback, type FC, type ReactNode } from 'react';
import { Building2 } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageHydrator } from '@/StorageHydrator';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { OwnerOperationStoppedView } from '@/core/organizations/OwnerOperationStoppedView';
import { PendingStaffInviteGate } from '@/core/staff/components/PendingStaffInviteGate';

// 워크스페이스는 인증 후 역할에 맞을 때만 로드 (로그인 입구와 번들 분리).
const LazyIndustryAppRouter = lazy(() =>
  import('@/app/industry/IndustryAppRouter').then((m) => ({ default: m.IndustryAppRouter }))
);
const IndustryAppRouter: FC = () => (
  <Suspense fallback={<LoadingScreen />}>
    <LazyIndustryAppRouter />
  </Suspense>
);

/** 소속 사업장이 없을 때 — 개설·고객 가입 갈림길 없이 안내만 표시 */
const NoOrganizationMembershipView: FC = () => {
  const { organizationsError, refreshOrganizations } = useOrganization();
  const handleRetry = useCallback(() => {
    void refreshOrganizations();
  }, [refreshOrganizations]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-6 text-center"
      data-testid="no-organization-membership"
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center">
        <Building2 className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <p className="text-sm font-semibold text-slate-800">소속 사업장이 없습니다</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          관리자에게 임직원 초대를 요청한 뒤 다시 로그인해 주세요.
        </p>
        {organizationsError ? (
          <p className="text-xs text-rose-600 mt-2">{organizationsError}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleRetry}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] hover:bg-indigo-700 transition-colors"
      >
        다시 확인
      </button>
    </div>
  );
};

interface SupabaseAppGateProps {
  children?: ReactNode;
}

/**
 * EP_apps Core App Gate.
 *
 * 유지 흐름:
 * 로그인 -> Supabase session -> AuthProvider -> OrganizationProvider
 * -> membership 조회 -> 단일 사업장 자동 선택 -> StorageHydrator -> IndustryAppRouter
 *
 * 보장 사항:
 * - 멤버십이 있으면 사업장 선택 화면 없이 바로 워크스페이스 진입
 * - blocked owner 진입 차단 (OwnerOperationStoppedView)
 * - StorageHydrator를 통한 도메인 스토리지 하이드레이션
 * - ?staff_link 토큰 감지 (PendingStaffInviteGate)
 */
export const SupabaseAppGate: FC<SupabaseAppGateProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const {
    loading: orgLoading,
    organizationsStatus,
    organizationsError,
    refreshOrganizations,
    currentOrganization,
    selectedMembership,
    organizations,
    blockedOwnerOrgIds,
  } = useOrganization();

  const handleRetry = useCallback(() => {
    void refreshOrganizations();
  }, [refreshOrganizations]);

  if (authLoading) {
    return <LoadingScreen message="로그인 세션을 확인하는 중..." />;
  }

  if (!user) {
    return null;
  }

  if (orgLoading || organizationsStatus === 'loading') {
    return <LoadingScreen message="사업장 정보를 불러오는 중..." />;
  }

  if (organizationsStatus === 'error' && (!organizations || organizations.length === 0)) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-4 text-center"
        data-testid="organization-gate-error"
      >
        <p className="text-sm text-rose-600 font-medium max-w-sm">
          {organizationsError || '사업장 목록을 불러오지 못했습니다.'}
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] hover:bg-indigo-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (currentOrganization && blockedOwnerOrgIds.includes(currentOrganization.id)) {
    return <OwnerOperationStoppedView />;
  }

  if (!currentOrganization || !selectedMembership) {
    return <NoOrganizationMembershipView />;
  }

  return (
    <StorageHydrator
      organizationId={currentOrganization.id}
      industryType={currentOrganization.industry_type}
    >
      <PendingStaffInviteGate />
      {children ?? <IndustryAppRouter />}
    </StorageHydrator>
  );
};

export default SupabaseAppGate;
