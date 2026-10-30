import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslate } from '@refinedev/core';
import type { CompanyAppFeatureAssignmentOption } from '@/pages/workspace/companyAppAccess';
import type { AppPermissionEffectiveState } from '@/pages/workspace/companyAppAccess';

export function memberDisplayName(
  member: { name?: string; email?: string; user_id: string },
  fallback = '직원'
): string {
  return member.name?.trim() || member.email?.trim() || `${fallback} (${member.user_id.slice(0, 8)})`;
}

export function memberInitial(member: { name?: string; email?: string; user_id: string }): string {
  const src = member.name || member.email || member.user_id;
  return src.charAt(0).toUpperCase();
}

type ToggleRowProps = {
  option: CompanyAppFeatureAssignmentOption;
  enabled: boolean;
  busy: boolean;
  onToggle: (next: boolean) => void;
  compact?: boolean;
  /** 앱 이용 행 보조 상태 (granted/denied/role/unset) */
  effectiveState?: AppPermissionEffectiveState;
};

/** 권한 한 줄 — 터치 영역 44px+, 스위치 패턴 */
export function FeaturePermissionToggleRow({
  option,
  enabled,
  busy,
  onToggle,
  compact = false,
  effectiveState,
}: ToggleRowProps): React.JSX.Element {
  const translate = useTranslate();
  const switchId = `perm-${option.key.replace(/[^a-z0-9_-]/gi, '-')}`;
  const label = translate(option.labelKey, option.label);
  const desc = translate(option.descKey, option.desc);

  const stateHint =
    effectiveState === 'denied'
      ? translate('ep.permissions.state.denied')
      : effectiveState === 'role'
        ? translate('ep.permissions.state.role')
        : effectiveState === 'granted'
          ? translate('ep.permissions.state.granted')
          : null;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border transition-colors ${
        enabled
          ? 'border-indigo-300 bg-indigo-50/80 shadow-2xs'
          : effectiveState === 'denied'
            ? 'border-rose-200 bg-rose-50/40'
            : 'border-slate-200 bg-white hover:border-slate-300'
      } ${compact ? 'p-2.5' : 'p-3.5'}`}
    >
      <div className="min-w-0 flex-1 pt-0.5">
        <label htmlFor={switchId} className="block cursor-pointer">
          <span className="text-sm font-bold text-slate-900">{label}</span>
          {!compact ? (
            <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{desc}</span>
          ) : null}
          {stateHint ? (
            <span
              className={`mt-1 block text-[10px] font-semibold ${
                effectiveState === 'denied' ? 'text-rose-700' : 'text-slate-500'
              }`}
            >
              {stateHint}
            </span>
          ) : null}
        </label>
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-busy={busy}
        disabled={busy}
        onClick={() => onToggle(!enabled)}
        className={`relative mt-0.5 inline-flex h-11 w-[3.25rem] shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
          enabled ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-[1.35rem]' : 'translate-x-0.5'
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-indigo-600" aria-hidden /> : null}
        </span>
        <span className="sr-only">
          {label} {enabled ? '켜짐' : '꺼짐'}
        </span>
      </button>
    </div>
  );
}

type SectionProps = {
  title: string;
  hint: string;
  countLabel: string;
  children: React.ReactNode;
};

export function FeaturePermissionSection({
  title,
  hint,
  countLabel,
  children,
}: SectionProps): React.JSX.Element {
  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h4>
          <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          {countLabel}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
