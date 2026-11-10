import React, { useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';
import { useTranslate } from '@refinedev/core';
import { Modal } from '@/shared/components/ui/Modal';
import { showToast } from '@/shared/feedback/uiFeedback';
import { grantMemberFeaturePermission } from '@/core/organizations/services/dynamicRoleService';
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import {
  COMPANY_APP_FEATURE_ASSIGNMENT_OPTIONS,
  COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS,
  canAccessCompanyApp,
  describeAppPermissionEffectiveState,
  type CompanyAppAccessInput,
} from '@/pages/workspace/companyAppAccess';
import { listAssignablePublishedApps } from '@/pages/workspace/publishedCompanyApps';
import {
  FeaturePermissionSection,
  FeaturePermissionToggleRow,
  memberDisplayName,
  memberInitial,
} from '@/pages/members/memberFeaturePermissionShared';

const MANAGER_OPTIONS = COMPANY_APP_FEATURE_ASSIGNMENT_OPTIONS.filter((o) => !o.appId);

type SheetTab = 'apps' | 'duties' | 'final';

type Props = {
  member: DynamicMemberRow | null;
  selfUserId?: string | null;
  initialTab?: SheetTab;
  onClose: () => void;
  onError: (message: string) => void;
  onMemberUpdated: (member: DynamicMemberRow) => void;
};

export function StaffAccessMemberSheet({
  member,
  selfUserId,
  initialTab = 'apps',
  onClose,
  onError,
  onMemberUpdated,
}: Props): React.JSX.Element {
  const translate = useTranslate();
  const [tab, setTab] = useState<SheetTab>(initialTab);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [inlineStatus, setInlineStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const appEnabledCount = useMemo(() => {
    if (!member) return 0;
    return COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.filter((o) =>
      Boolean(member.feature_permissions?.[o.key])
    ).length;
  }, [member]);

  const managerEnabledCount = useMemo(() => {
    if (!member) return 0;
    return MANAGER_OPTIONS.filter((o) => Boolean(member.feature_permissions?.[o.key])).length;
  }, [member]);

  const accessInput: CompanyAppAccessInput | null = useMemo(() => {
    if (!member) return null;
    return {
      role: member.role,
      customRole: null,
      feature_permissions: member.feature_permissions ?? null,
    };
  }, [member]);

  const isSelf = Boolean(member && selfUserId && member.user_id === selfUserId);

  async function setPermission(key: string, enabled: boolean) {
    if (!member) return;
    setSavingKey(key);
    setInlineStatus('idle');
    try {
      await grantMemberFeaturePermission(member.id, key, enabled);
      const updated: DynamicMemberRow = {
        ...member,
        feature_permissions: {
          ...(member.feature_permissions || {}),
          [key]: enabled,
        },
      };
      onMemberUpdated(updated);
      setInlineStatus('saved');
    } catch (err) {
      setInlineStatus('error');
      onError(err instanceof Error ? err.message : translate('ep.permissions.saveError'));
    } finally {
      setSavingKey(null);
    }
  }

  async function applyAllAppUsage(enabled: boolean) {
    if (!member) return;
    setBulkBusy(true);
    setInlineStatus('idle');
    try {
      for (const opt of COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS) {
        await grantMemberFeaturePermission(member.id, opt.key, enabled);
      }
      const nextPerms = { ...(member.feature_permissions || {}) };
      for (const opt of COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS) {
        nextPerms[opt.key] = enabled;
      }
      const updated = { ...member, feature_permissions: nextPerms };
      onMemberUpdated(updated);
      setInlineStatus('saved');
      showToast(
        enabled
          ? translate('ep.permissions.bulkAllGranted')
          : translate('ep.permissions.bulkAllRevoked'),
        'success'
      );
    } catch (err) {
      setInlineStatus('error');
      onError(err instanceof Error ? err.message : translate('ep.permissions.saveError'));
    } finally {
      setBulkBusy(false);
    }
  }

  const busy = Boolean(savingKey) || bulkBusy;
  const assignableApps = listAssignablePublishedApps();

  return (
    <Modal
      isOpen={Boolean(member)}
      onClose={onClose}
      title={translate('ep.permissions.title')}
      description={translate('ep.permissions.description')}
      maxWidth="lg"
      intent="form"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p
            className={`text-[11px] font-semibold ${
              inlineStatus === 'error'
                ? 'text-rose-600'
                : inlineStatus === 'saved'
                  ? 'text-emerald-600'
                  : 'text-transparent'
            }`}
            aria-live="polite"
          >
            {inlineStatus === 'saved'
              ? translate('ep.permissions.saved')
              : inlineStatus === 'error'
                ? translate('ep.permissions.saveError')
                : '—'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800"
          >
            {translate('ep.permissions.done')}
          </button>
        </div>
      }
    >
      {member ? (
        <div className="space-y-4" data-testid="staff-access-member-sheet">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-black text-indigo-800">
              {memberInitial(member)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">
                {memberDisplayName(member)}
              </p>
              {member.email ? (
                <p className="truncate text-xs text-slate-500">{member.email}</p>
              ) : null}
            </div>
            <div className="ml-auto hidden shrink-0 text-right sm:block">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {translate('ep.permissions.summary')}
              </p>
              <p className="text-xs font-semibold text-slate-700">
                {translate('ep.permissions.summaryApps', {
                  app: appEnabledCount,
                  appTotal: COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.length,
                })}
                <span className="mx-1 text-slate-300">·</span>
                {translate('ep.permissions.summaryManagers', {
                  mgr: managerEnabledCount,
                  mgrTotal: MANAGER_OPTIONS.length,
                })}
              </p>
            </div>
          </div>

          <div className="inline-flex w-full rounded-xl bg-slate-100 p-1">
            {(
              [
                ['apps', 'ep.staffAccess.sheet.tabApps'],
                ['duties', 'ep.staffAccess.sheet.tabDuties'],
                ['final', 'ep.staffAccess.sheet.tabFinal'],
              ] as const
            ).map(([id, labelKey]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`min-h-11 flex-1 rounded-lg px-2 text-xs font-bold ${
                  tab === id ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {translate(labelKey)}
              </button>
            ))}
          </div>

          {tab === 'apps' ? (
            <FeaturePermissionSection
              title={translate('ep.permissions.appUsage.section')}
              hint={translate('ep.permissions.appUsage.hint')}
              countLabel={translate('ep.permissions.appUsage.count', {
                enabled: appEnabledCount,
                total: COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.length,
              })}
            >
              <div className="flex flex-wrap gap-2 pb-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void applyAllAppUsage(true)}
                  className="min-h-9 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
                >
                  {bulkBusy
                    ? translate('ep.permissions.appUsage.saving')
                    : translate('ep.permissions.appUsage.enableAll')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void applyAllAppUsage(false)}
                  className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {translate('ep.permissions.appUsage.disableAll')}
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.map((opt) => (
                  <FeaturePermissionToggleRow
                    key={opt.key}
                    option={opt}
                    compact
                    enabled={Boolean(member.feature_permissions?.[opt.key])}
                    busy={savingKey === opt.key}
                    effectiveState={
                      opt.appId && accessInput
                        ? describeAppPermissionEffectiveState(opt.appId, accessInput)
                        : undefined
                    }
                    onToggle={(next) => void setPermission(opt.key, next)}
                  />
                ))}
              </div>
            </FeaturePermissionSection>
          ) : null}

          {tab === 'duties' ? (
            <FeaturePermissionSection
              title={translate('ep.permissions.manager.section')}
              hint={translate('ep.permissions.manager.hint')}
              countLabel={translate('ep.permissions.manager.count', {
                enabled: managerEnabledCount,
                total: MANAGER_OPTIONS.length,
              })}
            >
              {MANAGER_OPTIONS.map((opt) => (
                <FeaturePermissionToggleRow
                  key={opt.key}
                  option={opt}
                  enabled={Boolean(member.feature_permissions?.[opt.key])}
                  busy={savingKey === opt.key}
                  onToggle={(next) => void setPermission(opt.key, next)}
                />
              ))}
            </FeaturePermissionSection>
          ) : null}

          {tab === 'final' ? (
            <div className="space-y-3">
              <p className="text-[11px] leading-snug text-slate-500">
                {translate('ep.staffAccess.sheet.finalHint')}
              </p>
              <ul className="space-y-2">
                {assignableApps.map((app) => {
                  const ok = canAccessCompanyApp(app.id, accessInput);
                  const state = describeAppPermissionEffectiveState(app.id, accessInput);
                  return (
                    <li
                      key={app.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                        ok
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{app.label}</p>
                        <p className="text-[10px] font-semibold text-slate-500">
                          {translate(
                            state === 'granted'
                              ? 'ep.permissions.state.granted'
                              : state === 'denied'
                                ? 'ep.permissions.state.denied'
                                : state === 'role'
                                  ? 'ep.permissions.state.role'
                                  : 'ep.permissions.state.unset'
                          )}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${
                          ok ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {ok
                          ? translate('ep.staffAccess.sheet.finalYes')
                          : translate('ep.staffAccess.sheet.finalNo')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <p className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/80 p-3 text-[11px] leading-snug text-amber-900">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
            {translate('ep.permissions.adminNote')}
          </p>
          {isSelf ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
              {translate('ep.permissions.selfRefreshHint')}
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
