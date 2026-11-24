import React from 'react';

type Props = {
  tree: React.ReactNode;
  main: React.ReactNode;
  drawer?: React.ReactNode;
};

/** 좌측 트리(고정) + 중앙 보드/조직도 + 선택적 미배치 드로어 */
export function OrgWorkspaceLayout({ tree, main, drawer }: Props) {
  return (
    <div
      className="mt-4 grid min-h-[480px] gap-3 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:items-stretch"
      data-testid="org-workspace-layout"
    >
      <aside className="flex min-h-[320px] max-h-[min(72vh,760px)] min-w-0 flex-col overflow-hidden lg:sticky lg:top-2">
        {tree}
      </aside>
      <section className="flex min-h-[320px] max-h-[min(72vh,760px)] min-w-0 flex-col overflow-hidden">
        {main}
      </section>
      {drawer}
    </div>
  );
}
