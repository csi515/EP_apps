import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from './OrganizationProvider';
import {
  Building2,
  X,
  Sparkles,
  CheckCircle2,
  Loader2,
  KeyRound,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { type IndustryType, getIndustryCategoryForType } from '../industry/types';
import { IndustryPicker } from '../industry/IndustryPicker';
import {
  getPlaceLabel,
  getPlaceNamePlaceholder,
  isAppointmentIndustry,
} from '../industry/industryUi';
import { StorageService } from '@/services/storage';
import { withAttendanceModuleEnabled } from '@/core/attendance/features';
import { PIN_ATTENDANCE_DIRECTOR_COPY } from '@/core/attendance/attendanceNotifyCopy';
import { userFacingErrorMessage } from '@/shared/errors/userFacingError';
import {
  OrganizationLocationSetupError,
  ensureOrganizationDefaultLocation,
} from './services/organizationService';
import {
  EMPTY_ORGANIZATION_ADDRESS,
  OrganizationAddressFields,
  formatOrganizationAddress,
  type OrganizationAddressValue,
} from '@/core/address';

interface CreateOrganizationWizardProps {
  onComplete: () => void;
  onCancel: () => void;
  initialIndustryType?: IndustryType;
}

type AttendanceChoice = 'pin' | 'manual' | 'later';

export const CreateOrganizationWizard: React.FC<CreateOrganizationWizardProps> = ({
  onComplete,
  onCancel,
  initialIndustryType = 'piano',
}) => {
  const navigate = useNavigate();
  const org = useOrganization();
  const submittingRef = useRef(false);
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attendanceChoice, setAttendanceChoice] = useState<AttendanceChoice>('later');

  const [formData, setFormData] = useState({
    name: '',
    industryType: initialIndustryType,
  });
  const [addressParts, setAddressParts] = useState<OrganizationAddressValue>(
    EMPTY_ORGANIZATION_ADDRESS
  );

  const placeLabel = getPlaceLabel(formData.industryType);
  const appointmentStyle = isAppointmentIndustry(formData.industryType);
  // 출결 방식 설정 단계는 오직 '교육·학원' 카테고리 업종에만 적용
  const isEducationIndustry = getIndustryCategoryForType(formData.industryType) === 'education';

  const guideFeatureText = useMemo(() => {
    const cat = getIndustryCategoryForType(formData.industryType);
    if (formData.industryType === 'retail') {
      return '재고·판매·정산 관리 등';
    }
    switch (cat) {
      case 'education':
      case 'lesson':
        return '출결·수업 일정·수강료 관리 등';
      case 'fitness':
        return '회원권·수업 예약·락커 배정 등';
      case 'beauty':
      case 'wellness':
        return '시술 예약·고객 차트·매출 관리 등';
      case 'food':
        return '테이블 주문·재고·직원 스케줄 등';
      default:
        return '고객 관리·결제·스케줄 등';
    }
  }, [formData.industryType]);

  const handleStepInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(`${placeLabel} 이름을 입력해 주세요.`);
      return;
    }
    const fullAddress = formatOrganizationAddress(addressParts);
    if (!fullAddress) {
      setError(`${placeLabel} 주소를 검색하거나 직접 입력해 주세요.`);
      return;
    }
    setError(null);

    // 교육·학원 카테고리만 출결 방식 선택 단계로 진행, 그 외 업종은 즉시 개설 완료
    if (isEducationIndustry) {
      setStep(1);
    } else {
      await handleFinish('later');
    }
  };

  const handleFinish = async (choice: AttendanceChoice = attendanceChoice) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSaving(true);
    setError(null);
    const pinEnabled = isEducationIndustry ? choice === 'pin' : false;
    try {
      let orgId = createdOrgId;
      if (orgId) {
        await ensureOrganizationDefaultLocation(orgId);
      } else {
        orgId = await org.createOrganization(formData.name.trim(), formData.industryType, {
          directorName: StorageService.getActiveUser().name.trim(),
          address: formatOrganizationAddress(addressParts),
          addressParts,
          features: {
            attendance: { enabled: pinEnabled },
          },
        });
        if (isEducationIndustry) {
          const local = StorageService.getSettings();
          StorageService.saveSettings(withAttendanceModuleEnabled(local, pinEnabled));
        }
        setCreatedOrgId(orgId);
      }

      setStep(2);
    } catch (err) {
      submittingRef.current = false;
      if (err instanceof OrganizationLocationSetupError) {
        setCreatedOrgId(err.organizationId);
        setError(err.message);
      } else {
        setError(userFacingErrorMessage(err));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnterOrganization = async () => {
    if (!createdOrgId || isEntering) return;
    setIsEntering(true);
    setError(null);
    try {
      // refresh 먼저 하면 단일 사업장을 자동 선택하며 선택기가 언마운트된다.
      // 생성 직후 목록에 없으므로 selectOrganization이 최신 membership을 다시 조회한다.
      await org.selectOrganization(createdOrgId);
      onComplete();
    } catch (err) {
      setError(userFacingErrorMessage(err));
      setIsEntering(false);
    }
  };

  const steps = isEducationIndustry
    ? [
        { icon: Building2, label: '사업장 정보' },
        { icon: KeyRound, label: '출결 방식' },
        { icon: CheckCircle2, label: '완료' },
      ]
    : [
        { icon: Building2, label: '사업장 정보' },
        { icon: CheckCircle2, label: '완료' },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900">새 사업장 등록</h2>
          </div>
          {step < 2 && (
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="취소"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const activeIndex = isEducationIndustry ? step : step === 2 ? 1 : 0;
              const isActive = i === activeIndex;
              const isDone = i < activeIndex;
              return (
                <React.Fragment key={s.label}>
                  <div
                    className={`flex items-center gap-1.5 text-xs font-bold ${
                      isActive ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-indigo-100' : isDone ? 'bg-emerald-50' : 'bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 rounded ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {step === 0 && (
          <form onSubmit={handleStepInfo} className="p-6 space-y-4">
            {/* 업종 선택 및 맞춤 기능 안내 배너 */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100/90 flex items-center gap-2.5 shadow-2xs">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <p className="text-xs text-indigo-900 font-medium">
                운영하시는 업종을 선택하시면 업종 맞춤형 기능({guideFeatureText})이 자동으로 세팅됩니다.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                업종 <span className="text-rose-500">*</span>
              </label>
              <IndustryPicker
                value={formData.industryType}
                onChange={(industryType) => setFormData({ ...formData, industryType })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {placeLabel} 이름 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                data-testid="input-org-name"
                placeholder={getPlaceNamePlaceholder(formData.industryType)}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold min-h-[44px]"
                autoFocus
              />
            </div>
            <OrganizationAddressFields
              value={addressParts}
              onChange={setAddressParts}
              required
              label={`${placeLabel} 주소`}
            />

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="text-xs text-slate-400 hover:text-slate-600 min-h-[44px] px-3"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving}
                data-testid="btn-wizard-next"
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl min-h-[44px] disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>개설 중...</span>
                  </>
                ) : isEducationIndustry ? (
                  <>
                    <span>다음 (출결 방식)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>사업장 개설하기</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900">
                {appointmentStyle ? '방문·출입 관리 방식을 선택해주세요' : '출결 관리 방식을 선택해주세요'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">나중에 설정에서 언제든지 변경할 수 있습니다.</p>
            </div>

            <button
              type="button"
              onClick={() => setAttendanceChoice('pin')}
              className={`w-full text-left p-4 rounded-2xl border-2 min-h-[44px] transition-colors ${
                attendanceChoice === 'pin'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                {appointmentStyle ? '회원 PIN 출입' : '학생 PIN 출결'}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {appointmentStyle
                  ? PIN_ATTENDANCE_DIRECTOR_COPY.createOrgPinHintAppointment
                  : PIN_ATTENDANCE_DIRECTOR_COPY.createOrgPinHint}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAttendanceChoice('manual')}
              className={`w-full text-left p-4 rounded-2xl border-2 min-h-[44px] transition-colors ${
                attendanceChoice === 'manual'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-slate-600" />
                {appointmentStyle ? '직원이 직접 기록' : '선생님 직접 출결'}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {appointmentStyle
                  ? PIN_ATTENDANCE_DIRECTOR_COPY.createOrgManualHintAppointment
                  : PIN_ATTENDANCE_DIRECTOR_COPY.createOrgManualHint}
              </p>
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                disabled={isSaving}
                className="text-xs text-slate-400 hover:text-slate-600 min-h-[44px] px-3"
              >
                이전
              </button>
              <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
                {!createdOrgId && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleFinish('later')}
                    className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl min-h-[44px] disabled:opacity-50"
                  >
                    나중에 설정하기
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSaving}
                  data-testid="btn-wizard-submit"
                  onClick={() =>
                    void handleFinish(attendanceChoice === 'later' ? 'manual' : attendanceChoice)
                  }
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center justify-center gap-1 min-h-[44px] disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />{' '}
                      {createdOrgId ? '지점 준비 중...' : '등록 중...'}
                    </>
                  ) : createdOrgId ? (
                    '기본 지점 다시 준비'
                  ) : (
                    <>
                      등록하기 <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6 space-y-5 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">사업장 등록이 완료되었습니다</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {formData.name}
                <br />
                아래 버튼을 눌러 사업장으로 들어가세요.
              </p>
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700 text-left">
                {error}
              </div>
            )}
            <button
              type="button"
              disabled={isEntering || !createdOrgId}
              data-testid="btn-wizard-enter"
              onClick={() => void handleEnterOrganization()}
              className="w-full px-5 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              {isEntering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 들어가는 중...
                </>
              ) : (
                <>
                  사업장으로 들어가기 <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
