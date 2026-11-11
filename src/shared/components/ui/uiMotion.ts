/**
 * EP UI 모션 클래스 상수 — docs/EP_UI_INTERACTION.md 와 동일 문자열.
 * 화면별 커스텀 keyframes 대신 여기만 사용한다.
 */

export const uiMotion = {
  /** 탭/패널 전환·스켈레톤 이후 본문 */
  CONTENT_FADE: 'animate-in fade-in duration-200',
  /** KPI·진척 바 width */
  PROGRESS_WIDTH: 'transition-[width] duration-500 ease-out',
  /** 칩·세그먼트 눌림 (Button active:scale 톤) */
  PRESS_SCALE: 'active:scale-[0.98]',
  /** 모달 백드롭 (참고 — Modal 컴포넌트 내부 사용) */
  MODAL_BACKDROP: 'animate-in fade-in duration-200',
  /** 모달 패널 모바일 */
  MODAL_PANEL_MOBILE: 'animate-in slide-in-from-bottom duration-300',
  /** 모달 패널 데스크탑 */
  MODAL_PANEL_DESKTOP: 'sm:animate-in sm:zoom-in-95 sm:duration-200',
} as const;

export type UiMotionKey = keyof typeof uiMotion;
