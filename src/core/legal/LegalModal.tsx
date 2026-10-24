import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, Check } from 'lucide-react';
import { PrivacyContent, TermsContent } from './legalContent';
import type { LegalPageId } from './legalPaths';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
  onAgree?: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
  onAgree,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleAgreeAndClose = () => {
    if (onAgree) {
      onAgree();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        {/* 헤더 및 탭 */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 pt-4 pb-0">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h2 id="legal-modal-title" className="text-base font-bold text-slate-900">
                약관 및 정책 안내
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'terms'
                  ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              서비스 이용약관
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'privacy'
                  ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              개인정보처리방침
            </button>
          </div>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-700 flex-1 overscroll-contain">
          {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>

        {/* 푸터 액션 바 */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3.5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            {activeTab === 'terms' ? '서비스 이용을 위한 필수 약관입니다.' : '개인정보 보호법에 따른 처리방침입니다.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            >
              닫기
            </button>
            {onAgree && (
              <button
                type="button"
                onClick={handleAgreeAndClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                확인 및 동의
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
