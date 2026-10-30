import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Search, Users } from 'lucide-react';
import { useTranslate } from '@refinedev/core';
import { Modal } from '@/shared/components/ui/Modal';
import { showToast } from '@/shared/feedback/uiFeedback';
import { grantMemberFeaturePermission } from '@/core/organizations/services/dynamicRoleService';
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import {
  COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS,
  getMemberFeatureTriState,
} from '@/pages/workspace/companyAppAccess';
import { memberDisplayName, memberInitial } from './memberFeaturePermissionShared';

type Props = {
  open: boolean;
  members: DynamicMemberRow[];
  onClose: () => void;
  onError: (message: string) => void;
  onMembersUpdated: (updater: (prev: DynamicMemberRow[]) => DynamicMemberRow[]) => void;
};

type MemberFilter = 'all' | 'without' | 'with';

/** 선택 직원에게 동일 앱 이용 권한 일괄 부여·회수 */
export function MemberAppAccessBulkModal({
  open,
  members,
  onClose,
  onError,
  onMembersUpdated,
}: Props): React.JSX.Element {
  const translate = useTranslate();
  const activeMembers = useMemo(
    () => members.filter((m) => m.is_active !== false),
    [members]
  );

  const [featureKey, setFeatureKey] = useState(
    () => COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS[0]?.key ?? ''
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [memberSearch, setMemberSearch] = useState('');
  const [listFilter, setListFilter] = useState<MemberFilter>('all');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setFeatureKey(COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS[0]?.key ?? '');
    setSelectedIds(new Set());
    setMemberSearch('');
    setListFilter('all');
    setProgress(null);
  }, [open]);

  const selectedFeature =
    COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.find((o) => o.key === featureKey) ??
    COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS[0];

  const selectedLabel = selectedFeature
    ? translate(selectedFeature.labelKey, selectedFeature.label)
    : '';

  const grantedCount = useMemo(() => {
    if (!selectedFeature) return 0;
    return activeMembers.filter((m) => Boolean(m.feature_permissions?.[selectedFeature.key])).length;
  }, [activeMembers, selectedFeature]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return activeMembers.filter((m) => {
      const has = Boolean(selectedFeature && m.feature_permissions?.[selectedFeature.key]);
      if (listFilter === 'with' && !has) return false;
      if (listFilter === 'without' && has) return false;
      if (!q) return true;
      const name = memberDisplayName(m).toLowerCase();
      return name.includes(q) || m.email?.toLowerCase().includes(q) || m.user_id.toLowerCase().includes(q);
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

  function selectAllActive() {
    selectIds(activeMembers.map((m) => m.id));
  }

  function selectWithoutPermission() {
    if (!selectedFeature) return;
    selectIds(
      activeMembers.filter((m) => !m.feature_permissions?.[selectedFeature.key]).map((m) => m.id)
    );
  }

  function selectWithPermission() {
    if (!selectedFeature) return;
    selectIds(
      activeMembers.filter((m) => Boolean(m.feature_permissions?.[selectedFeature.key])).map((m) => m.id)
    );
  }

  function clearSelection() {
    setSelectedIds(new Set());
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
      onClose();
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
    if (succeededIds.size > 0 && failures.length < ids.length) {
      showToast(
        translate('ep.members.bulk.success', {
          label: selectedLabel,
          count: succeededIds.size,
          action: enabled
            ? translate('ep.members.bulk.actionGrant')
            : translate('ep.members.bulk.actionRevoke'),
        }),
        'info'
      );
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={translate('ep.members.bulk.title')}
      description={translate('ep.members.bulk.description')}
      maxWidth="lg"
      intent="form"
      footer={
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
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {translate('ep.members.bulk.cancel')}
            </button>
            <button
              type="button"
              disabled={busy || selectedIds.size === 0}
              onClick={() => void applyBulk(false)}
              className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              {translate('ep.members.bulk.revoke')}
            </button>
            <button
              type="button"
              disabled={busy || selectedIds.size === 0}
              onClick={() => void applyBulk(true)}
              className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? translate('ep.members.bulk.saving') : translate('ep.members.bulk.grant')}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold text-slate-700">{translate('ep.members.bulk.stepApp')}</p>
          <div
            className="mt-2 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory"
            role="listbox"
            aria-label={translate('ep.members.bulk.stepApp')}
          >
            {COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.map((opt) => {
              const active = opt.key === featureKey;
              const count = activeMembers.filter((m) =>
                Boolean(m.feature_permissions?.[opt.key])
              ).length;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={busy}
                  onClick={() => setFeatureKey(opt.key)}
                  className={`min-h-11 shrink-0 snap-start rounded-xl border px-3 py-2 text-left transition-colors ${
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
          {selectedFeature ? (
            <p className="mt-2 text-[11px] leading-snug text-slate-500">
              {translate(selectedFeature.descKey, selectedFeature.desc)}
            </p>
          ) : null}
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {translate('ep.members.bulk.currentApp', {
              granted: grantedCount,
              total: activeMembers.length,
            })}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-700">
            {translate('ep.members.bulk.stepMembers')}
          </p>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={memberSearch}
              disabled={busy}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder={translate('ep.members.bulk.searchPlaceholder')}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || activeMembers.length === 0}
              onClick={selectAllActive}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[11px] font-bold text-indigo-800"
            >
              <Users className="h-3.5 w-3.5" />
              {translate('ep.members.bulk.selectAll', { count: activeMembers.length })}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={selectWithoutPermission}
              className="min-h-9 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              {translate('ep.members.bulk.selectWithout')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={selectWithPermission}
              className="min-h-9 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              {translate('ep.members.bulk.selectWith')}
            </button>
            <button
              type="button"
              disabled={busy || selectedIds.size === 0}
              onClick={clearSelection}
              className="min-h-9 rounded-lg px-2.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
            >
              {translate('ep.members.bulk.clearSelection')}
            </button>
          </div>

          <div className="mt-2 flex gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                ['all', 'ep.members.bulk.filterAll'],
                ['without', 'ep.members.bulk.filterWithout'],
                ['with', 'ep.members.bulk.filterWith'],
              ] as const
            ).map(([id, labelKey]) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => setListFilter(id)}
                className={`min-h-9 flex-1 rounded-md text-[11px] font-bold transition-colors ${
                  listFilter === id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {translate(labelKey)}
              </button>
            ))}
          </div>

          <ul className="mt-3 max-h-[min(40vh,320px)] space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2">
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
                  <li key={member.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggleMember(member.id)}
                      className={`flex w-full min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
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
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
