import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  ChevronRight,
  Loader2,
  GraduationCap,
  LogOut,
  UserPlus,
  KeyRound,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useOrganization } from './OrganizationProvider';
import { getRoleLabel } from './services/organizationService';
import { getIndustryLabel, type IndustryType } from '../industry/types';
import { CreateOrganizationWizard } from './CreateOrganizationWizard';
import { TeacherJoinFlow } from './components/TeacherJoinFlow';
import { useAuth } from '../auth/AuthProvider';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { switchErrorMessage } from './roleContextHelpers';
import { StaffInviteAcceptModal } from '../staff/components/StaffInviteAcceptModal';

export const OrganizationSelector: React.FC = () => {
  const {
    organizations,
    selectOrganization,
    loading,
    organizationsStatus,
    organizationsError,
    refreshOrganizations,
    blockedOwnerOrgIds,
    canAccessCustomerPortal,
    enterCustomerPortal,
    canAccessParentPortal,
    enterParentPortal,
  } = useOrganization();
  const [retrying, setRetrying] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const { signOut, user } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [showTeacherFlow, setShowTeacherFlow] = useState(false);
  const [showStaffInviteAccept, setShowStaffInviteAccept] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const missingEmail = !user?.email?.trim();

  const handleSignOut = () => {
    setSigningOut(true);
    void signOut().finally(() => setSigningOut(false));
  };

  const handleRetry = () => {
    setRetrying(true);
    void refreshOrganizations().finally(() => setRetrying(false));
  };

  const handleSelectOrganization = async (organizationId: string) => {
    if (selectingId) return;
    setSelectingId(organizationId);
    try {
      await selectOrganization(organizationId);
    } catch (error) {
      showToast(switchErrorMessage(error), 'error', '사업장 선택 실패');
    } finally {
      setSelectingId(null);
    }
  };

  if (loading || signingOut || retrying) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-50"
        data-testid="organization-selector-loading"
      >
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (showTeacherFlow) {
    return <TeacherJoinFlow onBack={() => setShowTeacherFlow(false)} />;
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4 py-8"
      data-testid="organization-selector"
    >
      <div className="w-full max-w-lg">
        {/* 상단 액션 바: 계정 식별 및 명시적 로그아웃 */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl hover:bg-rose-50/60 transition-colors"
            aria-label="로그아웃"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
          {user?.email && (
            <span className="text-xs text-slate-400 font-medium truncate max-w-[220px]" title={user.email}>
              {user.email}
            </span>
          )}
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl text-white shadow-lg mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">시작하기</h1>
          {organizationsStatus === 'error' ? (
            <div className="mt-3 text-left rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-bold text-rose-800">사업장 정보를 불러오지 못했습니다</p>
              <p className="text-xs text-rose-700 mt-1">
                {organizationsError || '잠시 후 다시 시도해 주세요.'}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-3 min-h-[44px] px-4 rounded-xl bg-rose-700 text-white text-sm font-bold"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500 mt-2">
              {organizations.length === 0
                ? '매장을 운영하거나 수강생·직원으로 가입할 방식을 선택하세요.'
                : '운영·근무할 사업장을 선택하거나, 새 매장 개설 또는 이용자로 참여하세요.'}
            </p>
          )}
          {missingEmail && (
            <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-left leading-relaxed">
              이 계정에 이메일이 없습니다. 알림·계정 복구를 위해 나중에 설정에서 이메일을
              연결해 주세요. 이미 다른 방법으로 가입된 이메일은 자동으로 합쳐지지 않습니다.
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-5">
          {/* 0. 수강생/고객 또는 학부모 권한 보유 시 즉시 포털 진입 배너 */}
          {canAccessCustomerPortal && (
            <button
              type="button"
              onClick={enterCustomerPortal}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all text-left min-h-[44px] shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                  <UserRound className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">내 수강권 · 회원권 포털로 이동</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 font-bold">
                      고객 전용
                    </span>
                  </div>
                  <p className="text-xs text-indigo-700 font-medium mt-0.5">
                    등록된 매장의 출석·이용권·예약 현황을 확인합니다
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-indigo-500 shrink-0" />
            </button>
          )}

          {canAccessParentPortal && (
            <button
              type="button"
              onClick={enterParentPortal}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-all text-left min-h-[44px] shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">학부모 포털로 이동</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                      학부모 전용
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    자녀 출결 알림 및 교육 과정을 확인합니다
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-500 shrink-0" />
            </button>
          )}

          {/* 내 소속 사업장 목록 */}
          {organizations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                내 사업장 ({organizations.length})
              </p>
              <div className="space-y-2">
                {organizations.map((membership) => (
                  <button
                    key={membership.id}
                    type="button"
                    disabled={Boolean(selectingId)}
                    data-testid="organization-option"
                    onClick={() => void handleSelectOrganization(membership.organizationId)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left min-h-[44px] disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {membership.organization.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {getIndustryLabel(membership.organization.industry_type as IndustryType)} ·{' '}
                          {getRoleLabel(
                            membership.role,
                            membership.organization.industry_type as IndustryType
                          )}
                          {membership.role === 'owner' &&
                          blockedOwnerOrgIds.includes(membership.organizationId)
                            ? ' · 운영 중지'
                            : ''}
                        </p>
                      </div>
                    </div>
                    {selectingId === membership.organizationId ? (
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 역할별 진입 분기 1: 사업장 운영 및 신규 개설 */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              사업장 운영 및 신규 개설 (사업주/관리자)
            </p>

            {/* 10초 맞춤 빠른 셋업 (추천) */}
            <button
              type="button"
              data-testid="btn-quick-onboarding"
              onClick={() => navigate('/onboarding/quick')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold hover:from-indigo-700 hover:to-indigo-800 shadow-md shadow-indigo-100 transition-all text-left min-h-[44px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">10초 맞춤 빠른 셋업</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-extrabold">
                      추천
                    </span>
                  </div>
                  <p className="text-xs text-indigo-100 font-normal mt-0.5">
                    44개 업종 프리셋 & 12대 운영 도구가 자동 구성됩니다
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-indigo-200 shrink-0" />
            </button>

            <button
              type="button"
              data-testid="btn-open-create-org-wizard"
              onClick={() => setShowWizard(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-2xl text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors min-h-[44px] text-sm"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              직접 입력하여 사업장 등록하기
            </button>
          </div>

          {/* 역할별 진입 분기 2: 고객 / 수강생 이용자 경로 */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserRound className="w-3.5 h-3.5" />
              매장 · 학원 이용자 (수강생 / 회원)
            </p>
            <button
              type="button"
              data-testid="btn-customer-signup"
              onClick={() => navigate('/signup/customer')}
              className="w-full flex items-center justify-between p-3.5 border-2 border-indigo-100 bg-indigo-50/50 rounded-2xl text-slate-800 hover:bg-indigo-50 hover:border-indigo-200 transition-all min-h-[44px] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-950">
                    매장 · 학원 이용자로 가입 신청하기
                  </p>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    다니시는 매장을 검색하여 수강생/회원으로 연결 신청합니다
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-indigo-400 shrink-0" />
            </button>
          </div>

          {/* 역할별 진입 분기 3: 직원 / 강사 합류 경로 */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              직원 · 강사 합류
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="btn-staff-invite-code"
                onClick={() => setShowStaffInviteAccept(true)}
                className="flex items-center justify-center gap-2 p-3 border border-emerald-200 bg-emerald-50/50 rounded-2xl text-emerald-800 font-bold hover:bg-emerald-100/70 transition-colors min-h-[44px] text-xs"
              >
                <KeyRound className="w-4 h-4 text-emerald-600" />
                초대 코드로 합류
              </button>

              <button
                type="button"
                data-testid="btn-teacher-join"
                onClick={() => setShowTeacherFlow(true)}
                className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-2xl text-slate-700 font-bold hover:bg-slate-50 transition-colors min-h-[44px] text-xs"
              >
                <GraduationCap className="w-4 h-4 text-slate-500" />
                사업장 검색 후 가입
              </button>
            </div>
          </div>
        </div>
      </div>

      {showStaffInviteAccept && (
        <StaffInviteAcceptModal
          onClose={() => setShowStaffInviteAccept(false)}
          onAccepted={async (result) => {
            setShowStaffInviteAccept(false);
            showToast(`${result.organizationName}에 직원으로 연결되었습니다.`, 'success');
            await refreshOrganizations();
            if (result.organizationId) {
              await handleSelectOrganization(result.organizationId);
            }
          }}
        />
      )}

      {showWizard && (
        <CreateOrganizationWizard
          onComplete={() => setShowWizard(false)}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
};
