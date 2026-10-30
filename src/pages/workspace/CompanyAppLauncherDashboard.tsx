import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Target,
  Car,
  Bus,
  ShieldAlert,
  HeartHandshake,
  UtensilsCrossed,
  Package,
  Bell,
  ChevronRight,
  MessageSquareWarning,
} from 'lucide-react';
import { useList, useGetIdentity, useTranslate } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { canManageRoles } from '@/domain/permissions';
import {
  buildCompanyAppAccessInputFromStorageUser,
  canAccessCompanyApp,
  COMPANY_APP_ACCESS_LABELS,
  COMPANY_APP_LEGACY_MANAGER_FEATURE_KEYS,
} from './companyAppAccess';
import type { PublishedCompanyAppId } from './publishedCompanyApps';
import { listMyPendingApprovalLines } from '@/capabilities/sop_risk_assessment/services/riskAssessmentApprovalService';
import { useAuth } from '@/core/auth/AuthProvider';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { Modal } from '@/shared/components/ui/Modal';
import { FEATURE_OPTION_I18N } from '@/core/i18n/epAppsMessages';

export interface CompanyAppTile {
  id: string;
  to: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  badge?: string | number | null;
  badgeColor?: string;
  statusText?: string;
  requiredAnyCapability?: readonly string[];
}

interface PendingApprovalItem {
  id: string;
  title: string;
  requester: string;
  timeAgo: string;
  to: string;
  domainLabel: string;
}

function formatTimeAgo(iso?: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function resolveEnabledCaps(
  industryType: string | null | undefined,
  activeCapabilities: readonly string[],
  hiddenCapabilities: readonly string[],
  customAddons: readonly string[]
): string[] {
  const preset = getIndustryPreset(industryType ?? '');
  const baseCaps = (preset?.capabilities ?? []) as string[];
  const requiredCaps = new Set<string>((preset?.requiredCapabilities ?? []) as string[]);
  const hiddenFromSettings = ((preset?.defaultSettings as { hidden_capabilities?: string[] } | undefined)
    ?.hidden_capabilities ?? []) as string[];
  const hiddenSet = new Set([...hiddenCapabilities, ...hiddenFromSettings]);
  const combined = new Set([...baseCaps, ...activeCapabilities, ...customAddons]);
  return Array.from(combined).filter((cap) => requiredCaps.has(cap) || !hiddenSet.has(cap));
}

function tileAllowed(
  tile: CompanyAppTile,
  enabledCaps: readonly string[],
  memberAccessOk = true
): boolean {
  if (!memberAccessOk) return false;
  if (!tile.requiredAnyCapability || tile.requiredAnyCapability.length === 0) return true;
  return tile.requiredAnyCapability.some((c) => enabledCaps.includes(c));
}

export const CompanyAppLauncherDashboard: React.FC<{
  onSelectApp?: (appId: string) => void;
  /** 셸에서 넘기면 동일 소스 사용; 없으면 org·프리셋에서 계산 */
  enabledCapabilityIds?: readonly string[];
  /** compact: 인트라넷 허브용(브리핑·결재 배지 생략, 앱 그리드만) */
  variant?: 'home' | 'hub';
}> = ({ onSelectApp, enabledCapabilityIds, variant = 'home' }) => {
  const navigate = useNavigate();
  const translate = useTranslate();
  const { currentOrganization, activeCapabilities = [], hiddenCapabilities = [] } =
    useOrganization();
  const { data: user } = useGetIdentity<{ id?: string; name?: string; email?: string }>();
  const { user: authUser } = useAuth();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [sopPendingCount, setSopPendingCount] = useState(0);

  const activeUser = StorageService.getActiveUser();
  const userName = user?.name || activeUser?.name || '임직원';
  const showAdminEmptyCta = canManageRoles(activeUser);

  const userFeaturePermissions = useMemo<Record<string, boolean>>(() => {
    const raw = (activeUser as any)?.feature_permissions || {};
    return typeof raw === 'object' && raw !== null ? raw : {};
  }, [activeUser]);

  const appAccessInput = useMemo(
    () => buildCompanyAppAccessInputFromStorageUser(activeUser),
    [activeUser]
  );

  const assignedRoleBadges = useMemo(() => {
    return Object.entries(userFeaturePermissions)
      .filter(([key, val]) => Boolean(val) && (FEATURE_OPTION_I18N[key] || COMPANY_APP_ACCESS_LABELS[key]))
      .map(([key]) => {
        const i18n = FEATURE_OPTION_I18N[key];
        return i18n
          ? translate(i18n.chipKey, COMPANY_APP_ACCESS_LABELS[key] ?? key)
          : COMPANY_APP_ACCESS_LABELS[key];
      });
  }, [userFeaturePermissions, translate]);

  const enabledCaps = useMemo(() => {
    if (enabledCapabilityIds && enabledCapabilityIds.length > 0) {
      return [...enabledCapabilityIds];
    }
    const customAddons = ((currentOrganization?.settings as { custom_addons?: string[] } | undefined)
      ?.custom_addons ?? []) as string[];
    return resolveEnabledCaps(
      currentOrganization?.industry_type,
      activeCapabilities,
      hiddenCapabilities,
      customAddons
    );
  }, [
    enabledCapabilityIds,
    currentOrganization?.industry_type,
    currentOrganization?.settings,
    activeCapabilities,
    hiddenCapabilities,
  ]);

  const { query: approvalsQuery } = useList<{
    id: string;
    title: string;
    requester_name?: string | null;
    status?: string;
    created_at?: string | null;
    entity_type?: string | null;
  }>({
    resource: 'approval_requests',
    filters: [{ field: 'status', operator: 'eq', value: 'pending' }],
    sorters: [{ field: 'created_at', order: 'desc' }],
    pagination: { pageSize: 20 },
    queryOptions: {
      enabled: enabledCaps.includes('approval_workflow'),
    },
    // 홈 브리핑용 — 네트워크 실패 시 Refine 기본 "Failed to fetch" 토스트 억제
    errorNotification: false,
  });

  useEffect(() => {
    const uid = authUser?.id || user?.id;
    if (!uid || !enabledCaps.includes('sop_risk_assessment')) {
      setSopPendingCount(0);
      return;
    }
    let cancelled = false;
    void listMyPendingApprovalLines(uid)
      .then((lines) => {
        if (!cancelled) setSopPendingCount(lines.length);
      })
      .catch(() => {
        if (!cancelled) setSopPendingCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, user?.id, enabledCaps]);

  const pendingApprovals: PendingApprovalItem[] = useMemo(() => {
    const rows = approvalsQuery?.data?.data ?? [];
    const workflowItems = rows.map((r) => ({
      id: r.id,
      title: r.title,
      requester: r.requester_name || '기안자',
      timeAgo: formatTimeAgo(r.created_at),
      to: '/workspace/approvals',
      domainLabel: r.entity_type || '결재',
    }));
    if (sopPendingCount <= 0) return workflowItems;
    return [
      {
        id: 'sop-pending-aggregate',
        title: `안전·SOP 결재 대기 ${sopPendingCount}건`,
        requester: '위험성평가',
        timeAgo: '',
        to: '/workspace/sop-risk',
        domainLabel: 'sop_risk',
      },
      ...workflowItems,
    ];
  }, [approvalsQuery?.data?.data, sopPendingCount]);

  const appTiles: CompanyAppTile[] = useMemo(() => {
    const iconCls = 'h-5 w-5 text-white drop-shadow-sm';
    const all: CompanyAppTile[] = [
      {
        id: 'research',
        to: '/rnd',
        label: '연구소',
        icon: <FlaskConical className={iconCls} />,
        gradient: 'from-violet-500 to-purple-600',
        requiredAnyCapability: ['research_project'],
      },
      {
        id: 'mbo',
        to: '/workspace/mbo',
        label: 'MBO',
        icon: <Target className={iconCls} />,
        gradient: 'from-emerald-500 to-teal-600',
        requiredAnyCapability: ['mbo'],
      },
      {
        id: 'shuttle',
        to: '/workspace/shuttle/my',
        label: '통근 셔틀',
        icon: <Bus className={iconCls} />,
        gradient: 'from-blue-500 to-indigo-600',
        requiredAnyCapability: ['shuttle_dispatch'],
      },
      {
        id: 'resources',
        to: '/workspace/resources',
        label: '공용 자원',
        icon: <Car className={iconCls} />,
        gradient: 'from-amber-500 to-orange-600',
        requiredAnyCapability: ['booking', 'seat_room'],
      },
      {
        id: 'sop_risk',
        to: '/workspace/sop-risk',
        label: '작업표준·위험성평가',
        icon: <ShieldAlert className={iconCls} />,
        gradient: 'from-rose-500 to-red-600',
        requiredAnyCapability: ['sop_risk_assessment'],
        badge: sopPendingCount || null,
        badgeColor: 'bg-rose-500 text-white',
      },
      // 설비 점검은 연구소 앱(/rnd/maintenance) 사이드바로만 진입
      {
        id: 'grievances',
        to: '/workspace/grievances',
        label: '노경 건의함',
        icon: <MessageSquareWarning className={iconCls} />,
        gradient: 'from-indigo-500 to-violet-600',
        requiredAnyCapability: ['whistleblower_grievance'],
      },
      {
        id: 'volunteer',
        to: '/workspace/volunteer',
        label: '봉사활동',
        icon: <HeartHandshake className={iconCls} />,
        gradient: 'from-pink-500 to-rose-600',
        requiredAnyCapability: ['volunteer_activity'],
      },
      {
        id: 'meal_survey',
        to: '/workspace/meal-survey',
        label: '식수인원 조사',
        icon: <UtensilsCrossed className={iconCls} />,
        gradient: 'from-lime-500 to-green-600',
        requiredAnyCapability: ['meal_survey'],
      },
      {
        id: 'office_supply',
        to: '/workspace/office-supply',
        label: '사무용품 취합',
        icon: <Package className={iconCls} />,
        gradient: 'from-sky-500 to-blue-600',
        requiredAnyCapability: ['office_supply_request'],
      },
      // 내 계정·조직 설정(직급·사업장)은 헤더 계정 메뉴 /org-admin 허브로만 진입
    ];
    return all
      .filter((t) => {
        const memberOk = canAccessCompanyApp(t.id as PublishedCompanyAppId, appAccessInput);
        return tileAllowed(t, enabledCaps, memberOk);
      })
      .map((t) => {
        const legacyKey = COMPANY_APP_LEGACY_MANAGER_FEATURE_KEYS[t.id as PublishedCompanyAppId];
      const isFeatureManager = legacyKey ? Boolean(userFeaturePermissions[legacyKey]) : false;
      const finalBadge =
        t.badge ?? (isFeatureManager ? translate('ep.launcher.badgeManager') : null);
      const finalBadgeColor = t.badge ? t.badgeColor : (isFeatureManager ? 'bg-indigo-600 text-white' : undefined);
      return {
        ...t,
        badge: finalBadge,
        badgeColor: finalBadgeColor,
      };
      });
  }, [enabledCaps, sopPendingCount, appAccessInput, userFeaturePermissions, translate]);

  const handleTileClick = (tile: CompanyAppTile, e: React.MouseEvent) => {
    if (onSelectApp) {
      e.preventDefault();
      onSelectApp(tile.id);
      navigate(tile.to);
    }
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }, []);

  return (
    <WorkPageFrame width="hub" data-testid="company-app-launcher" data-variant={variant}>
      {variant === 'home' ? (
        <section className="mb-8">
          <div className="flex flex-row items-center justify-between gap-3 border-b border-slate-200/80 pb-5">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {translate('ep.launcher.greeting', { name: userName })}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{todayStr}</p>
              {assignedRoleBadges.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-medium text-slate-500">
                    {translate('ep.launcher.assignedRoles')}
                  </span>
                  {assignedRoleBadges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 shadow-2xs"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {pendingApprovals.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowApprovalModal(true)}
                className="group flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-left transition-all hover:bg-amber-100/80 hover:shadow-sm"
                title={translate('ep.launcher.pendingApprovals', { count: pendingApprovals.length })}
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-xs">
                    {pendingApprovals.length}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    {translate('ep.launcher.pendingApprovals', { count: pendingApprovals.length })}
                  </p>
                  <p className="text-[11px] text-amber-700">{translate('ep.launcher.pendingHint')}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-500 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="mb-4">
          <h1 className="text-lg font-bold text-slate-900">{translate('ep.launcher.hubTitle')}</h1>
          <p className="mt-1 text-xs text-slate-500">{translate('ep.launcher.hubHint')}</p>
        </section>
      )}

      <section>
        {variant === 'home' ? (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              {translate('ep.launcher.appsHeading', { count: appTiles.length })}
            </h2>
          </div>
        ) : null}

        {appTiles.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center"
            data-testid="company-app-launcher-empty"
          >
            <p className="text-sm font-bold text-slate-800">{translate('ep.launcher.empty.title')}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {translate('ep.launcher.empty.body')}
            </p>
            {showAdminEmptyCta ? (
              <Link
                to="/workspace/members"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700"
              >
                {translate('ep.launcher.empty.adminCta')}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2.5">
            {appTiles.map((app) => (
              <Link
                key={app.id}
                to={app.to}
                onClick={(e) => handleTileClick(app, e)}
                className="group relative flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-2 py-3 text-center shadow-xs transition-all duration-150 hover:border-slate-300 hover:shadow-sm active:scale-[0.98] min-h-[96px]"
              >
                {app.badge ? (
                  <span
                    className={`absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs ${
                      app.badgeColor || 'bg-rose-500 text-white'
                    }`}
                  >
                    {app.badge}
                  </span>
                ) : null}

                <div
                  className={`relative mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${app.gradient} shadow-sm transition-transform duration-150 group-hover:scale-105`}
                >
                  {app.icon}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/5 via-transparent to-white/20 pointer-events-none" />
                </div>

                <div className="w-full px-0.5">
                  <span className="block text-xs font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {app.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={showApprovalModal && pendingApprovals.length > 0}
        onClose={() => setShowApprovalModal(false)}
        title={translate('ep.launcher.pendingModalTitle')}
        maxWidth="md"
        footer={
          <button
            type="button"
            onClick={() => setShowApprovalModal(false)}
            className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {translate('ep.launcher.pendingClose')}
          </button>
        }
      >
        <ul className="space-y-2.5">
          {pendingApprovals.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 transition-colors hover:bg-slate-100"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-block rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                  {item.domainLabel}
                </span>
                <span className="text-[11px] text-slate-400">{item.timeAgo}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {translate('ep.launcher.pendingRequester', { name: item.requester })}
              </p>
              <div className="mt-3 flex justify-end">
                <Link
                  to={item.to}
                  onClick={() => setShowApprovalModal(false)}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  <span>{translate('ep.launcher.pendingOpen')}</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Modal>
    </WorkPageFrame>
  );
};

/** 단위 테스트용 타일 게이트 */
export function filterLauncherTilesForTest(
  tiles: CompanyAppTile[],
  enabledCaps: readonly string[]
): CompanyAppTile[] {
  return tiles.filter((t) => tileAllowed(t, enabledCaps));
}

export { resolveEnabledCaps, tileAllowed };
