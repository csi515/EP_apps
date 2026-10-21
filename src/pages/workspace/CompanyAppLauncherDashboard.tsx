import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Bus,
  Target,
  Car,
  MessageSquare,
  ShieldAlert,
  Settings,
  Bell,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useGetIdentity } from '@refinedev/core';
import { StorageService } from '@/services/storage';

export interface CompanyAppTile {
  id: string;
  to: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  badge?: string | number | null;
  badgeColor?: string;
  statusText?: string;
  requiredAnyCapability?: readonly string[];
}

interface PendingApprovalItem {
  id: string;
  domain: 'mbo' | 'resources' | 'research' | 'sop_risk';
  domainLabel: string;
  title: string;
  requester: string;
  timeAgo: string;
  to: string;
}

export const CompanyAppLauncherDashboard: React.FC<{
  onSelectApp?: (appId: string) => void;
}> = ({ onSelectApp }) => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { data: user } = useGetIdentity<{ name?: string; email?: string }>();
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const activeUser = StorageService.getActiveUser();
  const userName = user?.name || activeUser?.name || '임직원';
  const orgName = currentOrganization?.name || '사내 업무 포털';

  // 가상의 인앱 결재 대기 건 (MBO 목표 승인, 차량 배차 승인, SOP 작업표준 개정 승인 등)
  // 전자결재는 독립 앱이 아니며 업무 프로세스 내 승인 절차로만 동작함
  const pendingApprovals: PendingApprovalItem[] = useMemo(() => {
    return [
      {
        id: 'appr-1',
        domain: 'mbo',
        domainLabel: 'MBO',
        title: '2026 4분기 핵심 성과 지표(KPI) 수립안',
        requester: '김선임 연구원 (선행개발팀)',
        timeAgo: '15분 전',
        to: '/workspace/mbo',
      },
      {
        id: 'appr-2',
        domain: 'resources',
        domainLabel: '공용 자원',
        title: '업무용 법인 차량 배차 신청 (경기 연구소 출장 건)',
        requester: '이책임 (사업개발팀)',
        timeAgo: '1시간 전',
        to: '/workspace/resources',
      },
      {
        id: 'appr-3',
        domain: 'sop_risk',
        domainLabel: '작업표준',
        title: '차량 리프트 하부 정비 작업 SOP 개정 승인 요청',
        requester: '김정비 책임안전관리자 (정비팀)',
        timeAgo: '2시간 전',
        to: '/workspace/sop-risk',
      },
    ];
  }, []);

  // 7개 정예 앱 (모바일 앱 스타일)
  const appTiles: CompanyAppTile[] = useMemo(() => {
    return [
      {
        id: 'research',
        to: '/rnd',
        label: '연구소',
        description: '과제·장비·특허',
        icon: <FlaskConical className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-violet-500 to-purple-600',
        statusText: '진행 과제 4건',
      },
      {
        id: 'shuttle',
        to: '/workspace/shuttle/my',
        label: '셔틀버스',
        description: '노선 및 배차',
        icon: <Bus className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-sky-500 to-blue-600',
        statusText: '퇴근 A노선 18:30',
      },
      {
        id: 'mbo',
        to: '/workspace/mbo',
        label: 'MBO',
        description: '목표·마일스톤',
        icon: <Target className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-emerald-500 to-teal-600',
        badge: pendingApprovals.filter((a) => a.domain === 'mbo').length || null,
        badgeColor: 'bg-rose-500 text-white',
        statusText: '달성률 82%',
      },
      {
        id: 'resources',
        to: '/workspace/resources',
        label: '공용 자원',
        description: '건강관리실, 차량 예약',
        icon: <Car className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-amber-500 to-orange-600',
        badge: pendingApprovals.filter((a) => a.domain === 'resources').length || null,
        badgeColor: 'bg-rose-500 text-white',
        statusText: '오늘 예약 1건',
      },
      {
        id: 'sop_risk',
        to: '/workspace/sop-risk',
        label: '작업표준·위험성평가',
        description: 'SOP 공정 및 위험성평가',
        icon: <ShieldAlert className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-rose-500 to-red-600',
        badge: pendingApprovals.filter((a) => a.domain === 'sop_risk').length || null,
        badgeColor: 'bg-rose-500 text-white',
        statusText: '안전 공정 관리',
      },
      {
        id: 'feedbacks',
        to: '/workspace/feedbacks',
        label: '사내 소통',
        description: '건의함·공지',
        icon: <MessageSquare className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-indigo-500 to-violet-600',
        statusText: '새 소통 2건',
      },
      {
        id: 'settings',
        to: '/workspace/settings/roles',
        label: '설정',
        description: '조직도·부서, 권한 관리',
        icon: <Settings className="h-8 w-8 text-white drop-shadow-sm" />,
        gradient: 'from-zinc-500 to-slate-600',
        statusText: '조직도 및 직급',
      },
    ];
  }, [pendingApprovals]);

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
    <div
      className="mx-auto max-w-4xl px-4 py-6 sm:py-10"
      data-testid="company-app-launcher"
    >
      {/* 1. 상단 환영 브리핑 영역 */}
      <section className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>{orgName}</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              안녕하세요, {userName}님 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500">{todayStr} · 사내 스마트 업무 런처</p>
          </div>

          {/* 승인 대기 인라인 퀵 배지 */}
          {pendingApprovals.length > 0 && (
            <button
              type="button"
              onClick={() => setShowApprovalModal(true)}
              className="group flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-left transition-all hover:bg-amber-100/80 hover:shadow-sm"
              title="승인 대기 건 확인"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <Bell className="h-5 w-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-xs">
                  {pendingApprovals.length}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">처리 대기 승인 {pendingApprovals.length}건</p>
                <p className="text-[11px] text-amber-700">MBO 목표, 차량 배차, 안전 SOP 등</p>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-500 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </section>

      {/* 2. 사내 모바일 앱 그리드 (Squircle Apps Grid) */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            사내 업무 앱 ({appTiles.length})
          </h2>
          <span className="text-xs text-slate-400">모바일 런처 스타일 진입점</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {appTiles.map((app) => (
            <Link
              key={app.id}
              to={app.to}
              onClick={(e) => handleTileClick(app, e)}
              className="group relative flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 text-center shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg active:scale-95"
            >
              {/* 우측 상단 미결 배지 */}
              {app.badge ? (
                <span
                  className={`absolute top-3 right-3 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold shadow-xs ${
                    app.badgeColor || 'bg-rose-500 text-white'
                  }`}
                >
                  {app.badge}
                </span>
              ) : null}

              {/* 스쿼클 앱 아이콘 */}
              <div
                className={`relative mb-3.5 flex h-20 w-20 sm:h-22 sm:w-22 items-center justify-center rounded-[24px] bg-gradient-to-br ${app.gradient} shadow-md transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg`}
              >
                {app.icon}
                {/* 글래스 하이라이트 효과 */}
                <div className="absolute inset-0 rounded-[24px] bg-gradient-to-t from-black/5 via-transparent to-white/20 pointer-events-none" />
              </div>

              {/* 앱 라벨 & 설명 */}
              <div className="w-full">
                <span className="block text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {app.label}
                </span>
                <span className="mt-0.5 block text-xs font-medium text-slate-500 line-clamp-1">
                  {app.description}
                </span>

                {/* 상태/퀵 인포 캡션 */}
                {app.statusText && (
                  <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {app.statusText}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. 승인 대기 빠른 확인 모달 */}
      {showApprovalModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Bell className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">처리 대기 승인 목록</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              전자결재는 독립 앱이 아니며, 각 업무 기능(MBO, 공용 자원, 안전 SOP 등) 내의 결재 절차로 처리됩니다.
            </p>

            <ul className="mt-4 space-y-2.5">
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
                  <p className="mt-0.5 text-xs text-slate-500">기안자: {item.requester}</p>
                  <div className="mt-3 flex justify-end">
                    <Link
                      to={item.to}
                      onClick={() => setShowApprovalModal(false)}
                      className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                    >
                      <span>해당 앱에서 검토 및 승인</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
