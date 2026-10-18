import React, { useState, ReactNode } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, CheckCircle2, ArrowRight } from 'lucide-react';

export interface EmptyStateGuideStep {
  stepNumber?: number;
  title: string;
  detail?: string;
}

export interface EmptyStateGuide {
  badge?: string;
  title: string;
  steps: EmptyStateGuideStep[];
  tip?: string;
}

export interface EmptyStateHeroProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  } | ReactNode;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  } | ReactNode;
  guide?: EmptyStateGuide;
  defaultGuideOpen?: boolean;
  className?: string;
}

export const EmptyStateHero: React.FC<EmptyStateHeroProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  guide,
  defaultGuideOpen = false,
  className = '',
}) => {
  const [isGuideOpen, setIsGuideOpen] = useState(defaultGuideOpen);

  return (
    <div
      className={`bg-gradient-to-b from-slate-50/70 via-white to-slate-50/30 rounded-3xl p-6 sm:p-10 text-center border-2 border-dashed border-slate-200/90 shadow-2xs animate-in fade-in duration-300 max-w-2xl mx-auto my-6 ${className}`}
      data-testid="empty-state-hero"
    >
      {/* 아이콘 배지 */}
      {icon && (
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-indigo-50/90 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs animate-in zoom-in duration-300 delay-75">
          {icon}
        </div>
      )}

      {/* 메인 타이틀 & 설명 */}
      <h3 className="font-black text-slate-900 text-base sm:text-xl tracking-tight animate-in slide-in-from-bottom-2 duration-300 delay-100">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed animate-in slide-in-from-bottom-2 duration-300 delay-150">
          {description}
        </p>
      )}

      {/* 액션 버튼 그룹 */}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 animate-in slide-in-from-bottom-2 duration-300 delay-200">
          {action &&
            (React.isValidElement(action) ? (
              action
            ) : typeof action === 'object' && 'label' in action ? (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
              >
                {action.icon}
                <span>{action.label}</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>
            ) : null)}

          {secondaryAction &&
            (React.isValidElement(secondaryAction) ? (
              secondaryAction
            ) : typeof secondaryAction === 'object' && 'label' in secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-colors"
              >
                {secondaryAction.label}
              </button>
            ) : null)}
        </div>
      )}

      {/* 첫 등록 30초 가이드 팝오버 / 아코디언 */}
      {guide && (
        <div className="mt-7 pt-5 border-t border-slate-100 text-left">
          <button
            type="button"
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-indigo-50/60 hover:bg-indigo-50 transition-colors text-indigo-950 font-bold text-xs sm:text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Lightbulb className="w-3.5 h-3.5" />
              </span>
              <span>{guide.badge || '💡 30초 시작 가이드'}: {guide.title}</span>
            </div>
            {isGuideOpen ? (
              <ChevronUp className="w-4 h-4 text-indigo-700" />
            ) : (
              <ChevronDown className="w-4 h-4 text-indigo-700" />
            )}
          </button>

          {isGuideOpen && (
            <div className="mt-3 p-4 bg-white rounded-2xl border border-indigo-100/80 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-2.5">
                {guide.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {step.stepNumber ?? idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{step.title}</p>
                      {step.detail && (
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {guide.tip && (
                <div className="p-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>꿀팁:</strong> {guide.tip}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
