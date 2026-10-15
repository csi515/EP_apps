import React, { useState, useMemo } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  Save,
  Search,
  Filter,
  Users,
  Calendar,
  Wallet,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { CAPABILITY_MANIFESTS } from '@/capabilities';
import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';
import { resolveCapabilityDependencies } from '@/core/capabilities/capabilityDependency';
import { CustomTermsSettingCard } from './CustomTermsSettingCard';

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
    title: '운영, 진도 및 안전',
    icon: <ShieldCheck className="w-5 h-5 text-amber-600" />,
    capabilityIds: [
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
  const [activeTab, setActiveTab] = useState<'switchboard' | 'terms'>('switchboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const preset = useMemo(() => {
    return getIndustryPreset(currentOrganization?.industry_type || 'piano');
  }, [currentOrganization?.industry_type]);

  const presetBaseCaps = useMemo(() => {
    return (preset?.capabilities ?? []) as CapabilityId[];
  }, [preset]);

  // 현재 활성화된 기능 Set (프리셋 기본 + 사업주 추가 활성화)
  const effectiveActiveCaps = useMemo(() => {
    return new Set<CapabilityId>([...presetBaseCaps, ...(activeCapabilities as CapabilityId[])]);
  }, [presetBaseCaps, activeCapabilities]);

  const manifestMap = useMemo(() => {
    const map = new Map<CapabilityId, { displayName: string; description?: string }>();
    for (const m of CAPABILITY_MANIFESTS) {
      map.set(m.definition.id, {
        displayName: m.definition.displayName,
      });
    }
    return map;
  }, []);

  const handleToggle = async (capId: CapabilityId, currentState: boolean) => {
    const targetState = !currentState;

    // 프리셋 필수 기본 기능인 경우 비활성화 방어 안내
    if (!targetState && preset?.requiredCapabilities?.includes(capId as any)) {
      setToastMessage(`[${manifestMap.get(capId)?.displayName ?? capId}] 기능은 현재 업종 프리셋의 필수 기본 기능으로 비활성화할 수 없습니다.`);
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

      let msg = `[${manifestMap.get(capId)?.displayName ?? capId}] 기능이 ${targetState ? '활성화' : '비활성화'}되었습니다.`;
      if (result.autoEnabled.length > 0) {
        const autoNames = result.autoEnabled
          .map((id) => manifestMap.get(id)?.displayName ?? id)
          .join(', ');
        msg += `\n(필수 선행 조건에 의해 [${autoNames}] 기능이 함께 켜졌습니다.)`;
      }
      if (result.autoDisabled.length > 0) {
        const autoNames = result.autoDisabled
          .map((id) => manifestMap.get(id)?.displayName ?? id)
          .join(', ');
        msg += `\n(해당 기능을 의존하는 [${autoNames}] 기능이 함께 꺼졌습니다.)`;
      }

      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 상단 네비게이션 & 탭 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">사업장 기능 스위치보드 & 호칭 관리</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            타 업종 기능을 자유롭게 켜고 끄며(복합 매장 지원), 화면 내 맞춤 용어를 설정합니다.
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('switchboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'switchboard'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            기능 스위치보드
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'terms'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            맞춤 용어 사전
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-xl text-sm flex items-start gap-2.5 shadow-xs whitespace-pre-line animate-in fade-in">
          <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{toastMessage}</div>
        </div>
      )}

      {activeTab === 'terms' ? (
        <CustomTermsSettingCard />
      ) : (
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
                placeholder="기능 명칭 검색..."
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
                return name.toLowerCase().includes(searchQuery.toLowerCase()) || capId.includes(searchQuery.toLowerCase());
              });

              if (filteredCaps.length === 0) return null;

              return (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    {group.icon}
                    <h3 className="font-bold text-slate-900 text-base">{group.title}</h3>
                    <span className="text-xs font-semibold text-slate-400">({filteredCaps.length}개)</span>
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
                                      프리셋포함
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      확장부품
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">{capId}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggle(capId, isEnabled)}
                                disabled={isSaving || isRequired}
                                className={`flex-shrink-0 transition-transform active:scale-95 ${
                                  isRequired ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                }`}
                                title={isRequired ? '업종 기본 필수 기능' : isEnabled ? '기능 끄기' : '기능 켜기'}
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
                            <span className={isEnabled ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                              {isEnabled ? '● 활성화됨 (사용 중)' : '○ 비활성화'}
                            </span>
                            {isRequired && (
                              <span className="text-slate-400 text-[10px]">업종 기본 코어</span>
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
    </div>
  );
};
