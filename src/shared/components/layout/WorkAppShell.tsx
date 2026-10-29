import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export type WorkAppNavItem = {
  to: string;
  label: string;
  icon?: ReactNode;
  /** false면 메뉴에서 숨김 (권한 게이트) */
  visible?: boolean;
  /** true면 경로 완전 일치 시에만 활성 */
  end?: boolean;
};

export type WorkAppShellProps = {
  /** 앱 표시 이름 */
  title: string;
  items: readonly WorkAppNavItem[];
  children: ReactNode;
  /** 런처 복귀 경로 */
  launcherTo?: string;
};

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-xs font-medium transition-colors',
    isActive
      ? 'bg-indigo-50 font-bold text-indigo-700'
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
  );

/**
 * 사내 업무 앱 내부 셸 — 앱별 사이드바 + 본문.
 * 런처·글로벌 셸에는 쓰지 않고, 하위 경로가 있는 앱에서만 사용한다.
 */
export function WorkAppShell({
  title,
  items,
  children,
  launcherTo = '/workspace',
}: WorkAppShellProps) {
  const visibleItems = items.filter((item) => item.visible !== false);

  return (
    <div
      className="mx-auto flex w-full max-w-[1600px] min-h-[calc(100dvh-65px)]"
      data-testid="work-app-shell"
      data-work-app={title}
    >
      <aside
        className="sticky top-0 flex h-[calc(100dvh-65px)] w-56 shrink-0 flex-col border-r border-slate-200 bg-white no-print"
        aria-label={`${title} 메뉴`}
      >
        <div className="border-b border-slate-100 px-3.5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">앱</p>
          <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{title}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              {item.icon ? (
                <span className="shrink-0 text-current opacity-70">{item.icon}</span>
              ) : null}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-2.5">
          <Link
            to={launcherTo}
            className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <LayoutGrid className="h-4 w-4 shrink-0 text-slate-400" />
            사내 업무 앱
          </Link>
        </div>
      </aside>
      {/* 페이지 거터는 WorkPageFrame이 담당 */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
