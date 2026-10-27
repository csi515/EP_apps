import React, { useState, useEffect } from 'react';
import { BookOpen, RotateCcw, Save, CheckCircle2, Sparkles } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  STANDARD_TERM_KEYS,
  DEFAULT_TERMS,
  PRESET_DEFAULT_TERMS,
  getResolvedTerm,
  type StandardTermKey,
} from '@/core/i18n/termEngine';
import { resolveIndustryId } from '@/core/industry/resolveIndustry';

const TERM_META: Record<StandardTermKey, { label: string; placeholder: string; helper: string }> = {
  'term.customer': {
    label: '대상 호칭',
    placeholder: '예: 운영자, 임직원, 고객',
    helper: '업무 화면에서 대상을 부르는 공식 명칭입니다.',
  },
  'term.space': {
    label: '공간·자원 호칭',
    placeholder: '예: 회의실, 운영베이, 차량',
    helper: '공용자원·예약 대상이 되는 시설/공간 명칭입니다.',
  },
  'term.pass': {
    label: '이용권 호칭',
    placeholder: '예: 작업티켓, 이용권',
    helper: '배정·차감하는 권종 명칭입니다.',
  },
  'term.instructor': {
    label: '담당자 호칭',
    placeholder: '예: 작업자, 담당자, 직원',
    helper: '업무를 수행하는 담당자 호칭입니다.',
  },
  'term.lesson': {
    label: '업무·서비스 호칭',
    placeholder: '예: 작업, 업무, 서비스',
    helper: '제공하는 핵심 업무/서비스의 명칭입니다.',
  },
  'term.tenant': {
    label: '사업장 호칭',
    placeholder: '예: 사업장, 현장, 회사',
    helper: '테넌트(사업장)를 부르는 명칭입니다.',
  },
  'term.owner': {
    label: '대표 호칭',
    placeholder: '예: 대표, 공장장, 실장',
    helper: '사업장을 운영하는 책임자 호칭입니다.',
  },
  'term.staff': {
    label: '직원 호칭',
    placeholder: '예: 직원, 팀원, 실무자',
    helper: '운영을 돕는 실무 인력 호칭입니다.',
  },
  'term.billing': {
    label: '청구·정산 호칭',
    placeholder: '예: 비용, 청구, 정산',
    helper: '비용 청구와 정산을 부르는 명칭입니다.',
  },
};

export const CustomTermsSettingCard: React.FC = () => {
  const { currentOrganization, customTerms, updateCustomTerms } = useOrganization();
  const industryType = resolveIndustryId(currentOrganization?.industry_type) ?? '';

  const [formTerms, setFormTerms] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setFormTerms(customTerms || {});
  }, [customTerms]);

  const handleChange = (key: StandardTermKey, value: string) => {
    setFormTerms((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetToPreset = () => {
    const presetDefaults = PRESET_DEFAULT_TERMS[industryType] || {};
    setFormTerms(presetDefaults as Record<string, string>);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanedTerms: Record<string, string> = {};
      for (const [k, v] of Object.entries(formTerms)) {
        const trimmed = (v || '').trim();
        if (trimmed) {
          cleanedTerms[k] = trimmed;
        }
      }
      await updateCustomTerms(cleanedTerms);
      setFormTerms(cleanedTerms);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // 실시간 미리보기용 단어 추출
  const sampleCustomer = getResolvedTerm('term.customer', formTerms, industryType);
  const sampleSpace = getResolvedTerm('term.space', formTerms, industryType);
  const samplePass = getResolvedTerm('term.pass', formTerms, industryType);
  const sampleInstructor = getResolvedTerm('term.instructor', formTerms, industryType);
  const sampleLesson = getResolvedTerm('term.lesson', formTerms, industryType);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">매장 맞춤 용어 사전 (Terminology)</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            사업주 매장 성격에 맞게 고객, 공간, 이용권 등의 화면 레이블을 실시간 치환합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToPreset}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>업종 기본값 복원</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>저장 완료!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>용어 설정 저장</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 실시간 문장 미리보기 */}
      <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-pink-50/40 rounded-xl p-4 border border-indigo-100/80">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>실시간 화면 문구 미리보기</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed font-medium">
          &quot;<span className="text-indigo-700 font-bold underline underline-offset-2">{sampleCustomer}</span>님이{' '}
          <span className="text-purple-700 font-bold underline underline-offset-2">{sampleSpace}</span>에서{' '}
          <span className="text-blue-700 font-bold underline underline-offset-2">{samplePass}</span>(으)로{' '}
          <span className="text-emerald-700 font-bold underline underline-offset-2">{sampleInstructor}</span>의{' '}
          <span className="text-pink-700 font-bold underline underline-offset-2">{sampleLesson}</span>을(를) 예약했습니다.&quot;
        </p>
      </div>

      {/* 5대 용어 인풋 필드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {STANDARD_TERM_KEYS.map((key) => {
          const meta = TERM_META[key];
          const currentVal = formTerms[key] ?? '';
          const placeholderVal = getResolvedTerm(key, undefined, industryType);

          return (
            <div key={key} className="space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>{meta.label}</span>
                <span className="text-[10px] text-slate-400 font-mono">기본: {placeholderVal}</span>
              </label>
              <input
                type="text"
                value={currentVal}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholderVal}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
              />
              <p className="text-[11px] text-slate-400">{meta.helper}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
