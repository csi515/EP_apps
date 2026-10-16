import React, { useState, useMemo } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  Search,
  Filter,
  Users,
  Calendar,
  Wallet,
  ShieldCheck,
  ShoppingBag,
  CalendarClock,
  ReceiptText,
  GraduationCap,
  Box,
  Wrench,
  SlidersHorizontal,
  Store,
  HelpCircle,
  Info,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { CAPABILITY_MANIFESTS } from '@/capabilities';
import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';
import { resolveCapabilityDependencies } from '@/core/capabilities/capabilityDependency';
import {
  OPERATION_TOOL_SETS,
  OPERATION_TOOL_SET_MAP,
  resolveToolSetActivation,
  resolveToolSetDeactivation,
  getRecommendedToolSetsForPreset,
  getActiveToolSetIdsFromCapabilities,
  type OperationToolSetId,
} from '@/core/presets/operationBundles';
import { CustomTermsSettingCard } from './CustomTermsSettingCard';

// 9대 맞춤 세트 아이콘 맵
const SET_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  CalendarClock,
  UsersGear: Users,
  ReceiptText,
  GraduationCap,
  ShoppingBag,
  Box,
  Wrench,
  Sparkles,
};

interface CapabilityCategoryGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  capabilityIds: CapabilityId[];
}

const CATEGORY_GROUPS: CapabilityCategoryGroup[] = [
  {
    id: 'roster_attendance',
    title: '회원·원생 및 출결',
    icon: <Users className="w-5 h-5 text-indigo-600" />,
    capabilityIds: [
      'roster',
      'attendance',
      'passes',
      'locker',
      'membership_referral_tree',
      'consultation_crm',
    ],
  },
  {
    id: 'booking_space',
    title: '예약, 공간 및 스케줄',
    icon: <Calendar className="w-5 h-5 text-purple-600" />,
    capabilityIds: [
      'booking',
      'seat_room',
      'rental_equipment',
      'maintenance_checklist',
      'instructor_match',
      'shift_schedule',
      'seat_timer_billing',
      'kiosk_staff_call',
    ],
  },
  {
    id: 'finance_settlement',
    title: '정산, 수납 및 세무',
    icon: <Wallet className="w-5 h-5 text-emerald-600" />,
    capabilityIds: [
      'billing_invoicing',
      'ledger_simple',
      'credit_wallet',
      'commission_payroll',
      'deposit_escrow',
      'package_split_billing',
      'vendor_ap_invoice',
      'work_attendance_payroll',
    ],
  },
  {
    id: 'operations_safety',
    title: '운영, 진도 및 안전·사규',
    icon: <ShieldCheck className="w-5 h-5 text-amber-600" />,
    capabilityIds: [
      'workplace_policy',
      'task_pipeline',
      'curriculum_progress',
      'exam_grade_analytics',
      'safety_consent',
      'sop_risk_assessment',
      'hygiene_haccp_log',
      'lost_found',
      'digital_contract',
      'vehicle_shuttle',
      'diet_body_log',
      'treatment_chart',
      'treatment_portfolio',
    ],
  },
  {
    id: 'commerce_orders',
    title: '주문, 재고 및 단골 마케팅',
    icon: <ShoppingBag className="w-5 h-5 text-rose-600" />,
    capabilityIds: [
      'inventory',
      'pickup_orders',
      'loyalty_stamp',
      'table_order_kds',
      'recipe_bom',
      'retention_marketing',
      'waitlist_turn_queue',
    ],
  },
];

export const CapabilitySwitchboardPage: React.FC = () => {
  const { currentOrganization, activeCapabilities = [], updateActiveCapabilities } = useOrganization();
  const [activeTab, setActiveTab] = useState<'toolsets' | 'advanced' | 'terms'>('toolsets');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentIndustry = currentOrganization?.industry_type || 'piano';
  const preset = useMemo(() => {
    return getIndustryPreset(currentIndustry);
  }, [currentIndustry]);

  const presetBaseCaps = useMemo(() => {
    return (preset?.capabilities ?? []) as CapabilityId[];
  }, [preset]);

  // 현재 활성화된 기능 Set (프리셋 기본 + 사업주 추가 활성화)
  const effectiveActiveCaps = useMemo(() => {
    return new Set<CapabilityId>([...presetBaseCaps, ...(activeCapabilities as CapabilityId[])]);
  }, [presetBaseCaps, activeCapabilities]);

  // 현재 내 업종에 추천되는 세트 ID 목록
  const recommendedToolSetIds = useMemo(() => {
    return getRecommendedToolSetsForPreset(currentIndustry);
  }, [currentIndustry]);

  // 현재 완전히 활성화된 맞춤 세트 ID 목록
  const fullyActiveToolSetIds = useMemo(() => {
    return getActiveToolSetIdsFromCapabilities(Array.from(effectiveActiveCaps));
  }, [effectiveActiveCaps]);

  const manifestMap = useMemo(() => {
    const map = new Map<CapabilityId, { displayName: string; description?: string }>();
    for (const m of CAPABILITY_MANIFESTS) {
      map.set(m.definition.id, {
        displayName: m.definition.displayName,
      });
    }
    return map;
  }, []);

  // 1. [우리 매장 맞춤 세트] 원터치 토글 핸들러
  const handleToggleToolSet = async (toolSetId: OperationToolSetId, currentState: boolean) => {
    const targetState = !currentState;
    const toolSet = OPERATION_TOOL_SET_MAP.get(toolSetId);
    if (!toolSet) return;

    setIsSaving(true);
    try {
      const currentCaps = Array.from(effectiveActiveCaps);

      if (targetState) {
        // 활성화 시: DAG 선행 의존성까지 연쇄 활성화
        const result = resolveToolSetActivation([toolSetId], currentCaps);
        // 프리셋 기본 기능을 제외한 추가 목록만 DB에 저장
        const nextAdditional = result.nextCapabilities.filter((id) => !presetBaseCaps.includes(id));
        await updateActiveCapabilities(nextAdditional);

        let msg = `${toolSet.displayName}이 활성화되었습니다.\n좌측 메뉴에 0초 만에 즉시 반영되었습니다.`;
        if (result.autoEnabledCaps.length > 0) {
          const autoNames = result.autoEnabledCaps
            .map((id) => manifestMap.get(id)?.displayName ?? id)
            .join(', ');
          msg += `\n(필수 선행 도구인 [${autoNames}] 기능이 함께 준비되었습니다.)`;
        }
        setToastMessage(msg);
      } else {
        // 비활성화 시: 다른 활성 세트가 공유하는 도구는 보호하고 안전 비활성화
        const remainingActiveToolSets = fullyActiveToolSetIds.filter((id) => id !== toolSetId);
        const result = resolveToolSetDeactivation(toolSetId, remainingActiveToolSets, currentCaps);
        const nextAdditional = result.nextCapabilities.filter((id) => !presetBaseCaps.includes(id));
        await updateActiveCapabilities(nextAdditional);

        let msg = `${toolSet.displayName}이 비활성화되었습니다.`;
        if (result.autoDisabledCaps.length > 0) {
          msg += `\n(다른 활성 세트에서 사용 중인 공유 도구는 안전하게 유지되었습니다.)`;
        }
        setToastMessage(msg);
      }
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // 2. [세부 도구 개별 설정] 토글 핸들러
  const handleToggleSingleCapability = async (capId: CapabilityId, currentState: boolean) => {
    const targetState = !currentState;

    // 프리셋 필수 기본 기능인 경우 비활성화 방어 안내
    if (!targetState && preset?.requiredCapabilities?.includes(capId as any)) {
      setToastMessage(
        `[${manifestMap.get(capId)?.displayName ?? capId}] 도구는 현재 매장의 필수 기본 기능으로 비활성화할 수 없습니다.`
      );
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const currentArray = Array.from(effectiveActiveCaps);
    const result = resolveCapabilityDependencies(currentArray, capId, targetState);

    // 프리셋 기본 기능을 제외한 순수 사업주 추가 활성화 목록만 DB에 저장
    const nextAdditional = result.nextActive.filter((id) => !presetBaseCaps.includes(id));

    setIsSaving(true);
    try {
      await updateActiveCapabilities(nextAdditional);

      let msg = `[${manifestMap.get(capId)?.displayName ?? capId}] 도구가 ${
        targetState ? '활성화' : '비활성화'
      }되었습니다.`;
      if (result.autoEnabled.length > 0) {
        const autoNames = result.autoEnabled
          .map((id) => manifestMap.get(id)?.displayName ?? id)
          .join(', ');
        msg += `\n(필수 선행 조건에 의해 [${autoNames}] 도구가 함께 켜졌습니다.)`;
      }
      if (result.autoDisabled.length > 0) {
        const autoNames = result.autoDisabled
          .map((id) => manifestMap.get(id)?.displayName ?? id)
          .join(', ');
        msg += `\n(해당 도구를 의존하는 [${autoNames}] 도구가 함께 꺼졌습니다.)`;
      }

      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // 맞춤 세트 필터링 목록
  const displayedToolSets = useMemo(() => {
    return OPERATION_TOOL_SETS.filter((set) => {
      if (showRecommendedOnly && !recommendedToolSetIds.includes(set.id)) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchName = set.displayName.toLowerCase().includes(query) || set.shortName.toLowerCase().includes(query);
        const matchDesc = set.description.toLowerCase().includes(query);
        const matchCaps = set.capabilities.some((c) => {
          const capName = manifestMap.get(c)?.displayName ?? c;
          return capName.toLowerCase().includes(query);
        });
        return matchName || matchDesc || matchCaps;
      }
      return true;
    });
  }, [showRecommendedOnly, recommendedToolSetIds, searchQuery, manifestMap]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 상단 헤더 & 모드 전환 탭 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Store className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">매장 기능 관리</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              우리 매장 맞춤 설정
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1.5">
            우리 매장 운영 목적에 맞는 도구 세트를 켜면, 좌측 메뉴에 0초 만에 즉시 준비됩니다.
          </p>
        </div>

        {/* 3대 탭 전환 버튼 */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('toolsets')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'toolsets'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>우리 매장 맞춤 세트</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'advanced'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>세부 도구 개별 설정</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'terms'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>호칭 및 맞춤 용어</span>
          </button>
        </div>
      </div>

      {/* 실시간 알림 토스트 */}
      {toastMessage && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-xl text-sm flex items-start gap-2.5 shadow-xs whitespace-pre-line animate-in fade-in">
          <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{toastMessage}</div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: [우리 매장 맞춤 세트] 메인 스토어 뷰
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'toolsets' && (
        <div className="space-y-6">
          {/* 필터 및 검색 바 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRecommendedOnly(false)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  !showRecommendedOnly
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체 도구 세트 ({OPERATION_TOOL_SETS.length}개)
              </button>
              <button
                type="button"
                onClick={() => setShowRecommendedOnly(true)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  showRecommendedOnly
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>내 매장 추천 세트 ({recommendedToolSetIds.length}개)</span>
              </button>
            </div>

            <div className="relative sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="도구 세트 검색 (예: 출결, 예약, 사규...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 9대 맞춤 세트 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedToolSets.map((toolSet) => {
              const isRecommended = recommendedToolSetIds.includes(toolSet.id);
              const isFullyActive = fullyActiveToolSetIds.includes(toolSet.id);
              const SetIcon = SET_ICON_MAP[toolSet.iconName] || Sparkles;

              // 세트 내 도구별 활성 상태
              const toolDetails = toolSet.capabilities.map((capId) => {
                const isCapActive = effectiveActiveCaps.has(capId);
                const info = manifestMap.get(capId);
                return {
                  id: capId,
                  name: info?.displayName ?? capId,
                  active: isCapActive,
                };
              });

              return (
                <div
                  key={toolSet.id}
                  className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isFullyActive
                      ? 'bg-white border-indigo-300 shadow-md ring-1 ring-indigo-500/20'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-4">
                    {/* 상단 헤더: 아이콘 + 배지 + 토글 스위치 */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${
                            isFullyActive
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          <SetIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-base text-slate-900">
                              {toolSet.displayName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {toolSet.badge && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {toolSet.badge}
                              </span>
                            )}
                            {isRecommended && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                매장 추천
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 토글 스위치 */}
                      <button
                        type="button"
                        onClick={() => handleToggleToolSet(toolSet.id, isFullyActive)}
                        disabled={isSaving}
                        className="flex-shrink-0 transition-transform active:scale-95 cursor-pointer"
                        title={isFullyActive ? '세트 끄기' : '세트 켜기'}
                      >
                        {isFullyActive ? (
                          <ToggleRight className="w-9 h-9 text-indigo-600" />
                        ) : (
                          <ToggleLeft className="w-9 h-9 text-slate-300 hover:text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* 설명 */}
                    <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                      {toolSet.description}
                    </p>

                    {/* 하위 포함 도구 태그 칩 */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-400">포함 도구:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {toolDetails.map((td) => (
                          <span
                            key={td.id}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 ${
                              td.active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {td.active && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            <span>{td.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 하단 활성화 안내 바 */}
                  <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        isFullyActive ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    >
                      {isFullyActive ? '● 매장에 적용 중' : '○ 미사용'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {isFullyActive ? '좌측 메뉴 즉시 사용 가능' : '스위치를 켜면 즉시 준비됨'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: [세부 도구 개별 설정] 고급 제어 뷰
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          {/* 검색 및 카테고리 필터 바 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                  selectedCategory === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체 보기 ({manifestMap.size}개)
              </button>
              {CATEGORY_GROUPS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.title}</span>
                </button>
              ))}
            </div>

            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="개별 도구 명칭 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 카테고리별 그리드 표출 */}
          <div className="space-y-8">
            {CATEGORY_GROUPS.filter(
              (cat) => selectedCategory === 'ALL' || selectedCategory === cat.id
            ).map((group) => {
              const filteredCaps = group.capabilityIds.filter((capId) => {
                const info = manifestMap.get(capId);
                const name = info?.displayName ?? capId;
                return (
                  name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  capId.includes(searchQuery.toLowerCase())
                );
              });

              if (filteredCaps.length === 0) return null;

              return (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    {group.icon}
                    <h3 className="font-bold text-slate-900 text-base">{group.title}</h3>
                    <span className="text-xs font-semibold text-slate-400">
                      ({filteredCaps.length}개)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredCaps.map((capId) => {
                      const isBase = presetBaseCaps.includes(capId);
                      const isRequired = preset?.requiredCapabilities?.includes(capId as any);
                      const isEnabled = effectiveActiveCaps.has(capId);
                      const info = manifestMap.get(capId);
                      const name = info?.displayName ?? capId;

                      return (
                        <div
                          key={capId}
                          className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                            isEnabled
                              ? 'bg-white border-indigo-200 shadow-xs'
                              : 'bg-slate-50/70 border-slate-200/80 opacity-75'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                  <span>{name}</span>
                                  {isRequired ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                      기본필수
                                    </span>
                                  ) : isBase ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                      기본포함
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      확장도구
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {capId}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleSingleCapability(capId, isEnabled)}
                                disabled={isSaving || isRequired}
                                className={`flex-shrink-0 transition-transform active:scale-95 ${
                                  isRequired ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                }`}
                                title={
                                  isRequired
                                    ? '업종 기본 필수 도구'
                                    : isEnabled
                                    ? '도구 끄기'
                                    : '도구 켜기'
                                }
                              >
                                {isEnabled ? (
                                  <ToggleRight className="w-8 h-8 text-indigo-600" />
                                ) : (
                                  <ToggleLeft className="w-8 h-8 text-slate-300 hover:text-slate-400" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px]">
                            <span
                              className={isEnabled ? 'text-emerald-600 font-bold' : 'text-slate-400'}
                            >
                              {isEnabled ? '● 활성화됨 (사용 중)' : '○ 비활성화'}
                            </span>
                            {isRequired && (
                              <span className="text-slate-400 text-[10px]">매장 기본 도구</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: [호칭 및 맞춤 용어]
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'terms' && <CustomTermsSettingCard />}
    </div>
  );
};
