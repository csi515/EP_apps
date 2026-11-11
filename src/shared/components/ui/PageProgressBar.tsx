import React, { useEffect, useState } from 'react';

export type PageProgressBarProps = {
  /** true면 상단 indeterminate 막대 표시 */
  active: boolean;
  className?: string;
};

/**
 * 라우트·허브 데이터 fetch용 상단 2px 진행 막대.
 * prefers-reduced-motion 이어도 정적 바로 표시(진행 중임을 알리기 위함).
 */
export const PageProgressBar: React.FC<PageProgressBarProps> = ({
  active,
  className = '',
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  if (!active) return null;

  return (
    <div
      className={`pointer-events-none fixed left-0 right-0 top-0 z-[60] h-0.5 overflow-hidden bg-indigo-100/80 ${className}`}
      role="progressbar"
      aria-valuetext="불러오는 중"
      aria-busy="true"
    >
      <div
        className={
          reduceMotion
            ? 'h-full w-1/3 bg-indigo-600'
            : 'h-full w-1/3 bg-indigo-600 animate-[ep-page-progress_1.1s_ease-in-out_infinite]'
        }
      />
      <style>{`
        @keyframes ep-page-progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
};
