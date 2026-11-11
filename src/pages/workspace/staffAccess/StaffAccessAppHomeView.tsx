import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Users } from 'lucide-react';
import { useTranslate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import { Button } from '@/shared/components/ui/Button';
import { SearchField } from '@/shared/components/ui/SearchField';
import { ContentFadeIn } from '@/shared/components/ui/ContentFadeIn';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { grantMemberFeaturePermission } from '@/core/organizations/services/dynamicRoleService';
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import {
  COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS,
  getMemberFeatureTriState,
} from '@/pages/workspace/companyAppAccess';
import type { PublishedCompanyAppId } from '@/pages/workspace/publishedCompanyApps';
import { memberDisplayName, memberInitial } from '@/pages/members/memberFeaturePermissionShared';
import { computeStaffAccessAppKpis } from './staffAccessKpiEngine';

type MemberFilter = 'all' | 'without' | 'with';

type Props = {
  members: DynamicMemberRow[];
  initialAppId?: PublishedCompanyAppId | null;
  intentGrant?: boolean;
  onError: (message: string) => void;
  onMembersUpdated: (updater: (prev: DynamicMemberRow[]) => DynamicMemberRow[]) => void;
  onOpenMember: (memberId: string, appId: PublishedCompanyAppId) => void;
  onSwitchToMine?: () => void;
};

export function StaffAccessAppHomeView({
  members,
  initialAppId,
  intentGrant,
  onError,
  onMembersUpdated,
  onOpenMember,
  onSwitchToMine,
}: Props): React.JSX.Element {
  const translate = useTranslate();
  const activeMembers = useMemo(
    () => members.filter((m) => m.is_active !== false),
    [members]
  );

  const initialKey =
    COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.find((o) => o.appId === initialAppId)?.key ??
    COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS[0]?.key ??
    '';

  const [featureKey, setFeatureKey] = useState(initialKey);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [memberSearch, setMemberSearch] = useState('');
  const [listFilter, setListFilter] = useState<MemberFilter>(
    intentGrant ? 'without' : 'all'
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!initialAppId) return;
    const key = COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.find((o) => o.appId === initialAppId)?.key;
    if (key) setFeatureKey(key);
  }, [initialAppId]);

  useEffect(() => {
    if (intentGrant) setListFilter('without');
  }, [intentGrant]);

  const selectedFeature =
    COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.find((o) => o.key === featureKey) ??
    COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS[0];

  const selectedLabel = selectedFeature
    ? translate(selectedFeature.labelKey, selectedFeature.label)
    : '';

  const kpis = useMemo(() => {
    if (!selectedFeature?.appId) {
      return { granted: 0, without: 0, denied: 0, activeTotal: activeMembers.length };
    }
    return computeStaffAccessAppKpis(activeMembers, selectedFeature.appId);
  }, [activeMembers, selectedFeature?.appId]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return activeMembers.filter((m) => {
      // tri-state: true=granted, false=denied, unset=키 없음 — denied는 enabled(with)로 취급하지 않음
      const tri = selectedFeature
        ? getMemberFeatureTriState(selectedFeature.key, m.feature_permissions)
        : 'unset';
      if (listFilter === 'with' && tri !== 'granted') return false;
      if (listFilter === 'without' && tri !== 'unset') return false;
      if (!q) return true;
      const name = memberDisplayName(m).toLowerCase();
      return (
        name.includes(q) || m.email?.toLowerCase().includes(q) || m.user_id.toLowerCase().includes(q)
      );
    });
  }, [activeMembers, listFilter, memberSearch, selectedFeature]);

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectIds(ids: string[]) {
    setSelectedIds(new Set(ids));
  }

  async function applyBulk(enabled: boolean) {
    if (!selectedFeature || selectedIds.size === 0) {
      onError(translate('ep.members.bulk.needSelection'));
      return;
    }
    setBusy(true);
    const ids = Array.from(selectedIds);
    setProgress({ done: 0, total: ids.length });

    const results = await Promise.allSettled(
      ids.map(async (memberId, index) => {
        await grantMemberFeaturePermission(memberId, selectedFeature.key, enabled);
        setProgress({ done: index + 1, total: ids.length });
        return memberId;
      })
    );

    const succeededIds = new Set(
      results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value)
    );
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    if (succeededIds.size > 0) {
      onMembersUpdated((prev) =>
        prev.map((m) => {
          if (!succeededIds.has(m.id)) return m;
          return {
            ...m,
            feature_permissions: {
              ...(m.feature_permissions || {}),
              [selectedFeature.key]: enabled,
            },
          };
        })
      );
    }

    setBusy(false);
    setProgress(null);

    if (failures.length === 0) {
      showToast(
        translate('ep.members.bulk.success', {
          label: selectedLabel,
          count: succeededIds.size,
          action: enabled
            ? translate('ep.members.bulk.actionGrant')
            : translate('ep.members.bulk.actionRevoke'),
        }),
        'success'
      );
      setSelectedIds(new Set());
      return;
    }

    const firstReason =
      failures[0]?.reason instanceof Error
        ? failures[0].reason.message
        : translate('ep.members.bulk.failGeneric');
    onError(
      translate('ep.members.bulk.partialFail', {
        total: ids.length,
        failed: failures.length,
        reason: firstReason,
      })
    );
  }

  return (
    <div className="space-y-4" data-testid="staff-access-admin-home">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-indigo-800">
            {translate('ep.staffAccess.home.kpiGranted', { n: kpis.granted })}
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-700">
            {translate('ep.staffAccess.home.kpiWithout', { n: kpis.without })}
          </span>
          <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-rose-800">
            {translate('ep.staffAccess.home.kpiDenied', { n: kpis.denied })}
          </span>
        </div>
        {onSwitchToMine ? (
          <Button variant="outline" size="sm" onClick={onSwitchToMine}>
            {translate('ep.staffAccess.switchToMine')}
          </Button>
        ) : null}
      </div>

      <div>
        <p className="text-xs font-bold text-slate-700">{translate('ep.members.bulk.stepApp')}</p>
        <div
          className="mt-2 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory"
          role="listbox"
          aria-label={translate('ep.members.bulk.stepApp')}
        >
          {COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.map((opt) => {
            const active = opt.key === featureKey;
            const count = activeMembers.filter(
              (m) => getMemberFeatureTriState(opt.key, m.feature_permissions) === 'granted'
            ).length;
            return (
              <button
                key={opt.key}
                type="button"
                role="option"
                aria-selected={active}
                disabled={busy}
                onClick={() => setFeatureKey(opt.key)}
                className={`min-h-11 shrink-0 snap-start rounded-xl border px-3 py-2 text-left transition-all active:scale-[0.98] ${
                  active
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="block text-xs font-bold text-slate-900">
                  {translate(opt.labelKey, opt.label)}
                </span>
                <span className="mt-0.5 block text-[10px] text-slate-500">
                  {translate('ep.members.bulk.grantedCount', { granted: count })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SearchField
          type="search"
          value={memberSearch}
          disabled={busy}
          onChange={setMemberSearch}
          placeholder={translate('ep.members.bulk.searchPlaceholder')}
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || activeMembers.length === 0}
            leftIcon={<Users className="h-3.5 w-3.5" />}
            onClick={() => selectIds(activeMembers.map((m) => m.id))}
          >
            {translate('ep.members.bulk.selectAll', { count: activeMembers.length })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              selectedFeature &&
              selectIds(
                activeMembers
                  .filter(
                    (m) =>
                      getMemberFeatureTriState(selectedFeature.key, m.feature_permissions) ===
                      'unset'
                  )
                  .map((m) => m.id)
              )
            }
          >
            {translate('ep.members.bulk.selectWithout')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || selectedIds.size === 0}
            onClick={() => setSelectedIds(new Set())}
          >
            {translate('ep.members.bulk.clearSelection')}
          </Button>
        </div>

        <div className="mt-2">
          <SegmentedControl
            fullWidth
            value={listFilter}
            onChange={setListFilter}
            aria-label={translate('ep.members.bulk.stepMembers')}
            activeClassName="bg-white text-slate-900 shadow-xs"
            options={[
              { value: 'all', label: translate('ep.members.bulk.filterAll') },
              { value: 'without', label: translate('ep.members.bulk.filterWithout') },
              { value: 'with', label: translate('ep.members.bulk.filterWith') },
            ]}
          />
        </div>

        <ContentFadeIn motionKey={`${featureKey}-${listFilter}`} className="mt-3">
        <ul className="max-h-[min(52vh,480px)] space-y-1 overflow-y-auto rounded-xl border border-slate-100 bg-white p-2">
          {filteredMembers.length === 0 ? (
            <li className="py-8 text-center text-xs text-slate-500">
              {translate('ep.members.bulk.emptyList')}
            </li>
          ) : (
            filteredMembers.map((member) => {
              const checked = selectedIds.has(member.id);
              const tri = selectedFeature
                ? getMemberFeatureTriState(selectedFeature.key, member.feature_permissions)
                : 'unset';
              return (
                <li key={member.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleMember(member.id)}
                    className={`flex min-w-0 flex-1 min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                      checked ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    {checked ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
                    )}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      {memberInitial(member)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {memberDisplayName(member)}
                      </span>
                      {member.email ? (
                        <span className="block truncate text-[10px] text-slate-400">
                          {member.email}
                        </span>
                      ) : null}
                    </span>
                    {tri === 'granted' ? (
                      <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        {translate('ep.members.bulk.badgeGranted')}
                      </span>
                    ) : tri === 'denied' ? (
                      <span className="shrink-0 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        {translate('ep.members.bulk.badgeDenied')}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {translate('ep.members.bulk.badgeNone')}
                      </span>
                    )}
                  </button>
                  {selectedFeature?.appId ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onOpenMember(member.id, selectedFeature.appId!)}
                      className="shrink-0 min-h-11 rounded-lg px-2 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"
                    >
                      {translate('ep.staffAccess.home.openMember')}
                    </button>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
        </ContentFadeIn>
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 border-t border-slate-200 bg-white/95 px-1 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-500">
            {progress
              ? translate('ep.members.bulk.footerProgress', {
                  done: progress.done,
                  total: progress.total,
                })
              : translate('ep.members.bulk.footerIdle', {
                  selected: selectedIds.size,
                  active: activeMembers.length,
                })}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="destructive"
              disabled={busy || selectedIds.size === 0}
              onClick={() => void applyBulk(false)}
            >
              {translate('ep.members.bulk.revoke')}
            </Button>
            <Button
              variant="primary"
              isLoading={busy}
              disabled={selectedIds.size === 0}
              onClick={() => void applyBulk(true)}
            >
              {translate('ep.members.bulk.grant')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
