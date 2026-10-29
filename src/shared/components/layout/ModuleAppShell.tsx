import type { ReactNode } from 'react';
import { Header } from './Header';
import type { ModuleTheme } from './moduleTheme';
import { MODULE_THEMES } from './moduleTheme';
import { cn } from '@/shared/lib/utils';

interface ModuleAppShellProps {
  theme: ModuleTheme;
  /** 없으면 본문 full-width (EP_apps 데스크톱: 런처·헤더 내비) */
  sidebar?: ReactNode;
  children: ReactNode;
  /** Header 위 (예: SupabaseRoleSync) */
  beforeHeader?: ReactNode;
  /** Toast, Confirm 등 */
  overlays?: ReactNode;
  /**
   * App.tsx 가 이미 Header를 렌더할 때 true.
   * Layout 안 nested 크로뮴에서 이중 헤더를 막는다.
   */
  omitHeader?: boolean;
  /**
   * Layout 메인 영역 안에 넣을 때 true.
   * min-h-screen 셸 배경 대신 flex-1로 부모 높이를 채운다.
   * nested일 때 스크롤은 Layout이 담당하므로 main은 overflow-hidden.
   */
  nested?: boolean;
}

/**
 * 모듈 공통 앱 셸 — Header(+선택 사이드바) + 메인 (데스크톱 전용).
 */
export function ModuleAppShell({
  theme,
  sidebar = null,
  children,
  beforeHeader,
  overlays,
  omitHeader = false,
  nested = false,
}: ModuleAppShellProps) {
  const t = MODULE_THEMES[theme];

  return (
    <div
      className={cn(
        nested
          ? 'flex min-h-0 flex-1 flex-col bg-[#F1F5F9] text-slate-800 font-sans antialiased'
          : t.shell
      )}
      data-module-chrome={theme}
    >
      {beforeHeader}
      {!omitHeader ? <Header /> : null}
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1">
        {sidebar ?? null}
        <main
          data-work-scroll-root={nested ? undefined : true}
          data-testid={nested ? undefined : 'app-work-main'}
          className={cn(
            // 페이지 거터는 WorkPageFrame이 담당 (셸에서 p-* 중복 금지)
            'max-w-full flex-1',
            nested ? 'min-h-0 overflow-hidden' : 'overflow-x-hidden overflow-y-auto',
          )}
        >
          {children}
        </main>
      </div>
      {overlays}
    </div>
  );
}
