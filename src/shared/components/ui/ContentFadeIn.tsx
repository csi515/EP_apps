import React, { useEffect, useState, type ReactNode } from 'react';
import { uiMotion } from './uiMotion';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type ContentFadeInProps = {
  children: ReactNode;
  /** 값이 바뀌면 리마운트되어 페이드가 다시 재생된다 */
  motionKey?: string | number;
  className?: string;
};

/**
 * 탭/패널 전환·스켈레톤 이후 본문 1회 페이드.
 * prefers-reduced-motion 이면 애니메이션 없이 즉시 표시.
 */
export const ContentFadeIn: React.FC<ContentFadeInProps> = ({
  children,
  motionKey,
  className = '',
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(prefersReducedMotion());
  }, [motionKey]);

  return (
    <div
      key={motionKey}
      className={reduceMotion ? className : `${uiMotion.CONTENT_FADE} ${className}`.trim()}
    >
      {children}
    </div>
  );
};
