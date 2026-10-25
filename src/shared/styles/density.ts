/**
 * Moa-v2 통일된 UI 디자인 토큰 및 밀도 규격 (Design Tokens & Density Standard)
 * Tailwind class 관례 — 모든 신규 및 개편 컴포넌트는 이 규격을 준수합니다.
 */

export const DENSITY = {
  /** ModuleAppShell main */
  pagePad: 'p-3 sm:p-4 lg:p-5',
  /** 페이지 루트 스택 */
  pageStack: 'space-y-4 pb-4',
  /** 허브 embedded 자식 */
  embeddedStack: 'space-y-4 pb-2',
  sectionGap: 'space-y-4',
  cardPad: 'p-4 sm:p-5',
  cardRadius: 'rounded-2xl',
  pageTitle: 'text-lg sm:text-xl font-bold text-slate-900 tracking-tight',
} as const;

/** 3대 표준 높이 및 터치 타겟 규격 (W3C / Apple HIG 최소 터치타겟 준수) */
export const UI_SIZES = {
  sm: {
    height: 'min-h-[36px] h-9',
    text: 'text-xs',
    padding: 'px-3 py-1.5',
    icon: 'w-3.5 h-3.5',
    gap: 'gap-1.5',
  },
  md: {
    height: 'min-h-[44px] h-11',
    text: 'text-sm',
    padding: 'px-4 py-2.5',
    icon: 'w-4 h-4',
    gap: 'gap-2',
  },
  lg: {
    height: 'min-h-[48px] h-12',
    text: 'text-sm sm:text-base font-bold',
    padding: 'px-5 py-3',
    icon: 'w-5 h-5',
    gap: 'gap-2.5',
  },
} as const;

/** 중첩 곡률 규격 (Nested Radius System) */
export const UI_RADIUS = {
  modal: 'rounded-3xl',        // 24px: 최상위 대형 모달 / 시트
  card: 'rounded-2xl',         // 16px: 카드, 테이블 컨테이너, 섹션 박스
  control: 'rounded-xl',       // 12px: 버튼, 입력창, 드롭다운 셀렉트
  badge: 'rounded-lg',         // 8px: 사각형 뱃지, 미니 태그
  pill: 'rounded-full',        // 알약형 완전 둥근 뱃지
} as const;

/** 타이포그래피 계층 규격 (초소형 10px 남발 방지) */
export const UI_TYPOGRAPHY = {
  h1: 'text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight',
  h2: 'text-xl sm:text-2xl font-bold text-slate-900 tracking-tight',
  h3: 'text-lg sm:text-xl font-bold text-slate-900 tracking-tight',
  h4: 'text-base font-bold text-slate-900',
  body: 'text-sm text-slate-700 leading-relaxed',
  bodyMuted: 'text-xs text-slate-500 leading-normal',
  caption: 'text-xs font-semibold text-slate-600',
  meta: 'text-[11px] text-slate-400',
} as const;
