import React from 'react';
import { UserRound } from 'lucide-react';
import type { ImmediateSuperiorResult } from '@/core/organizations/resolveImmediateSuperior';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  result: ImmediateSuperiorResult | null | undefined;
};

function lineFor(result: ImmediateSuperiorResult): string {
  if (result.status === 'found' && result.superior) {
    const role = result.superior.roleName ? ` · ${result.superior.roleName}` : '';
    const dept = result.superior.departmentName
      ? ` (${result.superior.departmentName})`
      : '';
    return MBO_COPY.superiorFound(`${result.superior.displayName}${role}${dept}`);
  }
  if (result.status === 'no_department') return MBO_COPY.superiorNoDepartment;
  if (result.status === 'self_is_top') return MBO_COPY.superiorSelfTop;
  return MBO_COPY.superiorNone;
}

/** 조직도상 바로 윗 상급자 한 줄 표시 */
export function MboImmediateSuperiorBar({ result }: Props) {
  if (!result) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700"
      data-testid="mbo-immediate-superior"
    >
      <UserRound className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
      <span>{lineFor(result)}</span>
    </div>
  );
}
