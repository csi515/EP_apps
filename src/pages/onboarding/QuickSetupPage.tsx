import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from '@refinedev/react-hook-form';
import {
  Building2,
  CheckCircle2,
  Sparkles,
  Music,
  Waves,
  Dumbbell,
  Clock,
  Layers,
  Shield,
  Plus,
  X,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Settings2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Tag,
  SlidersHorizontal,
  Factory,
  Wrench,
} from 'lucide-react';
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { useTenant } from '@/core/auth/context/TenantContext';
import { applyDomainErrorToForm } from '@/core/utils/formErrorAdapter';
import {
  listIndustryPresets,
  getIndustryPreset,
} from '@/app/presets/presetRegistry';
import {
  recommendIndustryPreset,
  type RecommendationResult,
} from '@/app/presets/presetRecommendationEngine';
import {
  getQuestionsForIndustry,
  getStandardPresetsForIndustry,
  buildPresetPayload,
  type PresetRoleConfig,
  type PresetRoomConfig,
  type PresetOperatingHoursConfig,
  type IndustryQuestionField,
} from '@/app/presets/presetQuestionEngine';
import {
  OPERATION_TOOL_SETS,
  getRecommendedToolSetsForPreset,
  resolveToolSetActivation,
  type OperationToolSetId,
} from '@/core/presets/operationBundles';
import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';
import { getCapabilityDisplayName } from '@/capabilities';

interface QuickSetupFormData {
  name: string;
  industry: string;
  [key: string]: any;
}

const INDUSTRY_CARDS = [
  {
    id: 'piano',
    title: '피아노 학원',
    subtitle: '피아노 연습실 5개, 전임/파트 강사 직급, 30분 상담시간 자동 세팅',
    badge: '추천',
    icon: Music,
    color: 'indigo',
  },
  {
    id: 'sauna',
    title: '사우나 / 찜질방',
    subtitle: '남탕/여탕 락커 1~50번, 주/야간 카운터, 상시 18시간 운영 자동 세팅',
    badge: '인기',
    icon: Waves,
    color: 'cyan',
  },
  {
    id: 'pilates',
    title: '필라테스 스튜디오',
    subtitle: '리포머/체어/개인레슨실, 수석/일반 강사, 50분 수업 슬롯 자동 세팅',
    badge: '피트니스',
    icon: Dumbbell,
    color: 'emerald',
  },
  {
    id: 'custom',
    title: '직접 설정 (빈 화면)',
    subtitle: '업종 프리셋 없이 관리자 직급부터 백지 상태에서 시작합니다.',
    badge: '자유형',
    icon: Sparkles,
    color: 'slate',
  },
];

const CAPABILITY_LABEL_MAP: Record<string, string> = {
  attendance: '출결 체크인',
  booking: '예약 관리',
  passes: '이용권·회원권',
  locker: '사물함·락커',
  inventory: '재고 관리',
  seat_room: '좌석·공간 배정',
  rental_equipment: '장비 렌탈',
  maintenance_checklist: '점검 체크리스트',
  instructor_match: '강사 매칭',
  shift_schedule: '교대 근무',
  task_pipeline: '작업 파이프라인',
  billing_invoicing: '청구·인보이스',
  ledger_simple: '간편 장부',
  credit_wallet: '충전금·크레딧',
  consultation_crm: '상담 CRM',
  treatment_chart: '시술 차트',
  safety_consent: '안전 서약',
  parking_validator: '주차 정산·등록',
  emergency_alert_broadcast: '긴급 재난·공지 방송',
  digital_guestbook: '전자 방명록',
  trial_funnel: '체험 수업 유입',
  learning_journal: '수업·학습 일지',
  level_assessment: '급수·레벨 평가',
  daily_care_report: '돌봄·활동 알림장',
  vehicle_shuttle: '등하원 셔틀',
  makeup_lesson_pass: '보강권 발행',
  diet_body_log: '식단·체형 일지',
  exam_grade_analytics: '단원평가·성적 분석',
  entry_pass_ticket: '출입 티켓·패스',
  achievement_quest_badge: '퀘스트 뱃지·메달',
  facility_incident_report: '사고·파손 보고서',
  nps_survey_collector: '만족도 NPS 조사',
  workplace_policy: '매장 사규·서약',
  feedbacks: '고객 건의함',
  substitute_dispatch: '대강사 파견',
  recipe_bom: '부품표(BOM)·소모',
  sop_risk_assessment: '작업표준 SOP·위험성평가',
  quality_inspection: '품질검사·공차',
  approval_workflow: '전자결재·승인',
  change_management: '4M 변경관리(ECN)',
  supply_restock: '자재 발주·입고',
};

function formatCapabilityLabel(cap: string): string {
  return CAPABILITY_LABEL_MAP[cap] || getCapabilityDisplayName(cap);
}

const CATEGORY_TABS = [
  { id: 'all', label: '전체' },
  { id: 'education', label: '교육·학원' },
  { id: 'fitness', label: '운동·피트니스' },
  { id: 'beauty', label: '뷰티' },
  { id: 'wellness', label: '웰니스·스파' },
  { id: 'studio', label: '공간·스튜디오' },
  { id: 'childcare', label: '키즈·돌봄' },
  { id: 'manufacturing', label: '제조·가공', icon: Factory },
  { id: 'other', label: '기타 서비스' },
];

export const QuickSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchTenant } = useTenant();

  const [selectedIndustry, setSelectedIndustry] = useState<string>('piano');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // 40개 전체 업종 브라우저 상태
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const allPresets = useMemo(() => listIndustryPresets(), []);

  const filteredPresets = useMemo(() => {
    return allPresets.filter((p) => {
      const matchCat =
        selectedCategory === 'all' ||
        p.category === selectedCategory ||
        (selectedCategory === 'other' &&
          !['education', 'fitness', 'beauty', 'wellness', 'studio', 'childcare', 'manufacturing'].includes(
            p.category
          ));

      const matchSearch =
        !searchKeyword.trim() ||
        p.name.toLowerCase().includes(searchKeyword.toLowerCase().trim()) ||
        p.description.toLowerCase().includes(searchKeyword.toLowerCase().trim()) ||
        p.id.toLowerCase().includes(searchKeyword.toLowerCase().trim());

      return matchCat && matchSearch;
    });
  }, [allPresets, selectedCategory, searchKeyword]);

  const activePreset = useMemo(() => {
    return getIndustryPreset(selectedIndustry);
  }, [selectedIndustry]);

  // Pre-fill 상태 관리
  const [roles, setRoles] = useState<PresetRoleConfig[]>([]);
  const [rooms, setRooms] = useState<PresetRoomConfig[]>([]);
  const [lockerCount, setLockerCount] = useState<number>(50);
  const [operatingHours, setOperatingHours] = useState<PresetOperatingHoursConfig>({
    day_type: 'WEEKDAY',
    start_time: '13:00',
    end_time: '19:00',
    slot_minutes: 30,
  });

  // 직급 / 룸 인라인 추가 상태
  const [addingRole, setAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(1);

  // 동적 질문 필드 목록
  const [dynamicQuestions, setDynamicQuestions] = useState<IndustryQuestionField[]>([]);

  // 맞춤 도구 세트 선택 상태
  const [selectedToolSetIds, setSelectedToolSetIds] = useState<OperationToolSetId[]>([]);

  // AI 프리셋 진단 추천 상태
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState<RecommendationResult | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Refine / React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<QuickSetupFormData>({
    defaultValues: {
      name: '',
      industry: 'piano',
    },
  });

  // 업종 선택 시 추천값 자동 주입 (Pre-fill)
  const applyIndustryDefaults = (industry: string) => {
    setSelectedIndustry(industry);
    setValue('industry', industry);
    setGeneralError(null);

    const defaults = getStandardPresetsForIndustry(industry);
    setRoles([...defaults.roles]);
    setRooms(defaults.rooms ? [...defaults.rooms] : []);
    if (defaults.locker_count !== undefined) {
      setLockerCount(defaults.locker_count);
    }
    setOperatingHours({ ...defaults.operating_hours });

    const questions = getQuestionsForIndustry(industry);
    setDynamicQuestions(questions);

    // 업종별 추천 맞춤 도구 세트 자동 체크
    const recommendedSets = getRecommendedToolSetsForPreset(industry);
    setSelectedToolSetIds(recommendedSets);

    // 질문 기본값도 폼에 주입
    for (const q of questions) {
      setValue(q.id, q.defaultValue);
    }
  };

  // AI 프리셋 진단 실행
  const handleRunAiRecommendation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiAnalyzing(true);
    setTimeout(() => {
      const result = recommendIndustryPreset(aiQuery);
      setAiResult(result);
      setIsAiAnalyzing(false);

      if (result.topRecommendation) {
        applyIndustryDefaults(result.topRecommendation.presetId);
      }
    }, 200);
  };

  const handleToggleToolSetOption = (setId: OperationToolSetId) => {
    setSelectedToolSetIds((prev) =>
      prev.includes(setId) ? prev.filter((id) => id !== setId) : [...prev, setId]
    );
  };

  useEffect(() => {
    applyIndustryDefaults('piano');
  }, []);

  // 직급 조작
  const handleRemoveRole = (index: number) => {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddRole = () => {
    const roleName = newRoleName.trim();
    if (!roleName) return;
    if (roles.some((r) => r.name.toLowerCase() === roleName.toLowerCase())) {
      setGeneralError('이미 등록된 직급명입니다.');
      return;
    }
    setRoles((prev) => [
      ...prev,
      {
        name: roleName,
        rank_order: (prev.length + 1) * 10,
        permissions: ['attendance:checkin'],
      },
    ]);
    setNewRoleName('');
    setAddingRole(false);
    setGeneralError(null);
  };

  // 룸 조작
  const handleRemoveRoom = (index: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddRoom = () => {
    const roomName = newRoomName.trim();
    if (!roomName) return;
    if (rooms.some((r) => r.name.toLowerCase() === roomName.toLowerCase())) {
      setGeneralError('이미 등록된 공간/룸 이름입니다.');
      return;
    }
    setRooms((prev) => [
      ...prev,
      {
        name: roomName,
        capacity: newRoomCapacity || 1,
      },
    ]);
    setNewRoomName('');
    setNewRoomCapacity(1);
    setAddingRoom(false);
    setGeneralError(null);
  };

  // 1회 원자적 DB 생성 RPC 호출
  const onSubmit = async (data: QuickSetupFormData) => {
    const trimmedName = data.name?.trim() || '';
    if (!trimmedName || trimmedName.length < 2) {
      setError('name', { message: '사업장 상호명을 공백 제외 2자 이상 입력해 주세요.' });
      return;
    }

    if (roles.length === 0) {
      setGeneralError('사업장 운영을 위해 최소 1개 이상의 직급(예: 대표, 원장, 사장 등)이 필요합니다.');
      return;
    }

    setSubmitting(true);
    setGeneralError(null);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error('데이터베이스 서비스에 연결할 수 없습니다. 네트워크 연결 또는 환경 설정을 확인해 주세요.');
      }

      // 선택된 맞춤 세트로부터 필요한 추가 Capability 자동 계산
      const presetCaps = (activePreset?.capabilities ?? []) as CapabilityId[];
      const activationResult = resolveToolSetActivation(selectedToolSetIds, presetCaps);
      const additionalCaps = activationResult.nextCapabilities.filter(
        (id) => !presetCaps.includes(id)
      );

      const payload = buildPresetPayload(selectedIndustry, {
        ...data,
        name: trimmedName,
        roles,
        rooms,
        locker_count: selectedIndustry === 'sauna' ? lockerCount : undefined,
        operating_hours: operatingHours,
        active_capabilities: additionalCaps,
      });

      const { data: rpcResult, error } = await getCoreClient().rpc(
        'create_organization_with_preset',
        {
          p_org_name: trimmedName,
          p_industry: selectedIndustry,
          p_custom_config: payload as any,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      const result = rpcResult as any;
      if (!result?.success || !result?.organization_id) {
        throw new Error('사업장 생성 결과가 올바르지 않습니다.');
      }

      // 테넌트 즉시 전환 및 워크스페이스 이동
      await switchTenant(result.organization_id);
      navigate('/workspace');
    } catch (err: unknown) {
      const applied = applyDomainErrorToForm(err, setError, 'name');
      if (!applied) {
        setGeneralError(
          err instanceof Error ? err.message : '사업장 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* 상단 타이틀 */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>10초 만에 끝나는 원자적 셋업</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            신규 사업장 맞춤 온보딩
          </h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            업종만 선택하면 최적화된 직급, 룸/락커 공간, 운영 시간표가 자동 채워집니다.
            모든 설정은 언제든 수정 가능합니다.
          </p>
        </div>

        {generalError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-700 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* AI 기반 사업장 맞춤 프리셋 자동 진단 섹션 */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-indigo-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>AI 맞춤 업종 프리셋 자동 진단</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                      지능형 추천
                    </span>
                  </h2>
                  <p className="text-xs text-indigo-200/80">
                    운영하시는 사업장의 특징이나 필요한 기능을 자연어로 편하게 적어주시면 가장 적합한 프리셋을 찾아드립니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRunAiRecommendation();
                    }
                  }}
                  placeholder="예: 판교에서 20명 규모 성인 피아노 학원을 운영하고 연습실 대여와 주차 등록이 필요해요"
                  className="w-full h-12 pl-4 pr-10 rounded-xl bg-slate-800/80 border border-indigo-500/30 text-sm text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 transition"
                />
                {aiQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setAiQuery('');
                      setAiResult(null);
                    }}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRunAiRecommendation()}
                disabled={isAiAnalyzing || !aiQuery.trim()}
                className="h-12 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
              >
                {isAiAnalyzing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{isAiAnalyzing ? 'AI 분석 중...' : '맞춤 프리셋 진단'}</span>
              </button>
            </div>

            {/* AI 추천 결과 카드 */}
            {aiResult?.topRecommendation && (
              <div className="bg-indigo-950/60 border border-indigo-400/30 p-4 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-800/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-indigo-200">추천 1순위:</span>
                    <span className="text-sm font-bold text-white">
                      {aiResult.topRecommendation.presetName}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      일치도 {aiResult.topRecommendation.score}%
                    </span>
                  </div>
                  <span className="text-xs text-indigo-300">
                    ✓ 추천 설정이 아래 폼에 자동 적용되었습니다
                  </span>
                </div>

                <p className="text-xs text-indigo-100/90 leading-relaxed">
                  {aiResult.topRecommendation.explanation}
                </p>

                {/* 추가 추천 Add-on 배지 */}
                {aiResult.topRecommendation.recommendedAddons.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-indigo-300 font-semibold">
                      함께 추천하는 부가기능:
                    </span>
                    {aiResult.topRecommendation.recommendedAddons.map((addon) => (
                      <span
                        key={addon.capabilityId}
                        className="text-xs px-2.5 py-1 rounded-lg bg-indigo-800/80 text-indigo-200 border border-indigo-600/40 flex items-center gap-1.5"
                        title={addon.reason}
                      >
                        <Tag className="w-3 h-3 text-indigo-400" />
                        <span>{addon.name}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* 대안 추천 */}
                {aiResult.alternativeRecommendations.length > 0 && (
                  <div className="pt-2 flex items-center gap-2 text-xs text-indigo-300">
                    <span>다른 후보:</span>
                    {aiResult.alternativeRecommendations.map((alt) => (
                      <button
                        key={alt.presetId}
                        type="button"
                        onClick={() => applyIndustryDefaults(alt.presetId)}
                        className="underline hover:text-white"
                      >
                        {alt.presetName} ({alt.score}%)
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 1: 기본 사업장 정보 & 업종 선택 */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                사업장 (상호명) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register('name', {
                    required: '사업장 상호명을 입력해주세요.',
                    validate: (v) =>
                      v.trim().length >= 2 || '상호명은 공백을 제외하고 2자 이상 입력해 주세요.',
                  })}
                  placeholder="예: 모아 피아노 스튜디오, 청담 사우나, 바른 필라테스"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">
                  {errors.name.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                업종 선택 (추천 프리셋)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {INDUSTRY_CARDS.map((card) => {
                  const isSelected = selectedIndustry === card.id;
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => applyIndustryDefaults(card.id)}
                      className={`relative p-5 text-left rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {card.badge}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">
                          {card.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {card.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 40개 전체 업종 토글 & 브라우저 */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCatalogOpen(!isCatalogOpen)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition text-sm font-semibold text-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    <span>전체 업종 프리셋 카탈로그 ({allPresets.length}개 업종)</span>
                  </div>
                  {isCatalogOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {isCatalogOpen && (
                  <div className="mt-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3.5 animate-fade-in">
                    {/* 검색창 */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="업종명 또는 키워드로 검색 (예: 태권도, 네일, 골프, 스터디카페, 세차장...)"
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>

                    {/* 카테고리 필터 탭 */}
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_TABS.map((tab) => {
                        const TabIcon = (tab as any).icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedCategory(tab.id)}
                            className={`text-xs px-3 py-1 rounded-full font-medium transition inline-flex items-center gap-1.5 ${
                              selectedCategory === tab.id
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* 업종 카드 그리드 */}
                    <div className="max-h-72 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {filteredPresets.map((preset) => {
                        const isSelected = selectedIndustry === preset.id;
                        const isManufacturing = preset.category === 'manufacturing';
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              applyIndustryDefaults(preset.id);
                            }}
                            className={`p-3 text-left rounded-xl border transition flex flex-col justify-between ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="text-xs font-bold text-slate-900 inline-flex items-center gap-1.5">
                                {isManufacturing && <Factory className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                {preset.name}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-sm shrink-0 font-medium ${
                                  isManufacturing
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isManufacturing ? '제조·가공' : preset.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                              {preset.description}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {preset.capabilities.slice(0, 3).map((cap) => (
                                <span
                                  key={cap}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                                >
                                  {formatCapabilityLabel(cap)}
                                </span>
                              ))}
                              {preset.capabilities.length > 3 && (
                                <span className="text-[9px] text-slate-400">
                                  +{preset.capabilities.length - 3}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 선택된 업종 및 활성화 Capability 요약 배너 */}
              <div className="mt-4 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                      현재 선택: {activePreset?.name || (selectedIndustry === 'custom' ? '직접 설정' : selectedIndustry)}
                    </span>
                    {activePreset?.readinessLevel && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        {activePreset.readinessLevel === 'verified'
                          ? '운영 검증'
                          : activePreset.readinessLevel === 'basic_ui'
                          ? '기본 UI 지원'
                          : activePreset.readinessLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    {activePreset?.description || '사용자 정의 커스텀 설정으로 진행합니다.'}
                  </p>
                </div>
                {activePreset?.capabilities && activePreset.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:max-w-md">
                    {activePreset.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 shadow-2xs"
                      >
                        <Tag className="w-2.5 h-2.5 text-indigo-500" />
                        {formatCapabilityLabel(cap)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Step 1.5: [우리 매장 맞춤 세트] 자동 추천 및 선택 */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    [우리 매장 맞춤 세트] 선택
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  선택하신 업종에 가장 필요한 기본 도구 세트가 자동 체크되었습니다. 필요한 세트를 자유롭게 추가·해제하세요.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                {selectedToolSetIds.length}개 세트 선택됨
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {OPERATION_TOOL_SETS.map((set) => {
                const isSelected = selectedToolSetIds.includes(set.id);
                const isRecommended = set.recommendedFor.includes('*') || set.recommendedFor.includes(selectedIndustry);

                return (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => handleToggleToolSetOption(set.id)}
                    className={`p-4 text-left rounded-2xl border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/30 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-bold text-sm text-slate-900">
                          {set.displayName}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-3">
                        {set.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isRecommended && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            추천 세트
                          </span>
                        )}
                        {set.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            {set.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {set.capabilities.slice(0, 3).map((capId) => (
                          <span
                            key={capId}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200/80 shadow-2xs"
                          >
                            {formatCapabilityLabel(capId)}
                          </span>
                        ))}
                        {set.capabilities.length > 3 && (
                          <span className="text-[10px] text-slate-400">
                            +{set.capabilities.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: 동적 Pre-fill 추천 설정 검토 & 커스텀 */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  추천 기본값 (즉시 수정 가능)
                </h2>
                <p className="text-xs text-slate-500">
                  선택하신 업종 표준으로 미리 채워졌습니다. 필요한 항목을 현장에 맞게 변경하세요.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                Pre-fill 활성화
              </span>
            </div>

            {/* A. 직급 구성 칩 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>직급 및 계급도 ({roles.length}개)</span>
                </label>
                {!addingRole && (
                  <button
                    type="button"
                    onClick={() => setAddingRole(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>직급 추가</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {roles.map((r, idx) => (
                  <div
                    key={`${r.name}-${idx}`}
                    className="h-9 pl-3 pr-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold flex items-center space-x-1.5 border border-slate-200/60"
                  >
                    <span>{r.name}</span>
                    <span className="text-[10px] text-slate-400">#{r.rank_order}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(idx)}
                      className="w-5 h-5 rounded-md hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {addingRole && (
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="신규 직급명"
                      className="h-9 px-3 rounded-xl border border-indigo-400 text-xs font-medium focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddRole}
                      className="h-9 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingRole(false)}
                      className="h-9 px-2 text-slate-400 hover:text-slate-600"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* B. 공간 (룸/연습실) 구성 - 피아노, 필라테스 등 */}
            {(selectedIndustry === 'piano' ||
              selectedIndustry === 'pilates' ||
              rooms.length > 0) && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>공간 / 룸 목록 ({rooms.length}개)</span>
                  </label>
                  {!addingRoom && (
                    <button
                      type="button"
                      onClick={() => setAddingRoom(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>공간 추가</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {rooms.map((rm, idx) => (
                    <div
                      key={`${rm.name}-${idx}`}
                      className="h-9 pl-3 pr-2 rounded-xl bg-indigo-50/70 text-indigo-900 text-xs font-semibold flex items-center space-x-1.5 border border-indigo-200/60"
                    >
                      <span>{rm.name}</span>
                      {rm.capacity && (
                        <span className="text-[10px] text-indigo-500">
                          ({rm.capacity}인)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveRoom(idx)}
                        className="w-5 h-5 rounded-md hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 flex items-center justify-center transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {addingRoom && (
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="공간명"
                        className="h-9 px-3 rounded-xl border border-indigo-400 text-xs font-medium focus:outline-none"
                        autoFocus
                      />
                      <input
                        type="number"
                        min="1"
                        value={newRoomCapacity}
                        onChange={(e) => setNewRoomCapacity(Number(e.target.value) || 1)}
                        className="h-9 w-16 px-2 rounded-xl border border-slate-300 text-xs text-center"
                        title="수용 정원"
                      />
                      <button
                        type="button"
                        onClick={handleAddRoom}
                        className="h-9 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                      >
                        추가
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingRoom(false)}
                        className="h-9 px-2 text-slate-400 hover:text-slate-600"
                      >
                        취소
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* C. 락커 수량 - 사우나인 경우 */}
            {selectedIndustry === 'sauna' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  남탕/여탕 락커 번호 수량 (개)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={lockerCount}
                    onChange={(e) => setLockerCount(Number(e.target.value) || 1)}
                    className="h-12 w-32 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <p className="text-xs text-slate-500">
                    남탕 1~{lockerCount}번, 여탕 1~{lockerCount}번 사물함이 자동 벌크 생성됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* D. 운영 및 상담 시간 */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>운영 / 상담 시간대</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">시작 시각</span>
                  <input
                    type="time"
                    value={operatingHours.start_time}
                    onChange={(e) =>
                      setOperatingHours((prev) => ({ ...prev, start_time: e.target.value }))
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">종료 시각</span>
                  <input
                    type="time"
                    value={operatingHours.end_time}
                    onChange={(e) =>
                      setOperatingHours((prev) => ({ ...prev, end_time: e.target.value }))
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">시간 간격 (슬롯)</span>
                  <select
                    value={operatingHours.slot_minutes}
                    onChange={(e) =>
                      setOperatingHours((prev) => ({
                        ...prev,
                        slot_minutes: Number(e.target.value) || 30,
                      }))
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value={30}>30분 단위</option>
                    <option value={50}>50분 단위</option>
                    <option value={60}>60분 (1시간) 단위</option>
                    <option value={90}>90분 단위</option>
                  </select>
                </div>
              </div>
            </div>

            {/* E. Capability 동적 질문 필드 (선언형 조립) */}
            {dynamicQuestions.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>세부 Capability 정책 (선택 조정)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dynamicQuestions.map((q) => (
                    <div key={q.id} className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        {q.label}
                      </label>
                      {q.type === 'select' && q.options ? (
                        <select
                          {...register(q.id)}
                          className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                          {q.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : q.type === 'boolean' ? (
                        <div className="flex items-center space-x-2 pt-2">
                          <input
                            type="checkbox"
                            id={q.id}
                            {...register(q.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <label htmlFor={q.id} className="text-xs text-slate-600 cursor-pointer">
                            {q.description || '활성화'}
                          </label>
                        </div>
                      ) : q.type === 'number' ? (
                        <input
                          type="number"
                          {...register(q.id, { valueAsNumber: true })}
                          placeholder={q.placeholder}
                          className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      ) : (
                        <input
                          type="text"
                          {...register(q.id)}
                          placeholder={q.placeholder}
                          className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      )}
                      {q.description && q.type !== 'boolean' && (
                        <p className="text-[11px] text-slate-400">{q.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 3: 제출 버튼 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>원자적 사업장 및 리소스 생성 중...</span>
                </>
              ) : (
                <>
                  <span>이 설정으로 10초 만에 시작하기</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              단 1회의 원자적 트랜잭션으로 사업장, 소유자 권한, 직급, 룸/락커, 운영시간이 구축됩니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
