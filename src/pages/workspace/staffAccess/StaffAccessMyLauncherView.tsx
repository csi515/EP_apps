import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslate } from '@refinedev/core';
import {
  describeAppPermissionEffectiveState,
  type CompanyAppAccessInput,
  type AppPermissionEffectiveState,
} from '@/pages/workspace/companyAppAccess';
import { listAssignablePublishedApps } from '@/pages/workspace/publishedCompanyApps';
import { buildStaffAccessPath } from './staffAccessNav';

type Props = {
  accessInput: CompanyAppAccessInput | null;
  canManage: boolean;
  onSwitchToAdmin?: () => void;
};

function stateLabelKey(state: AppPermissionEffectiveState): string {
  if (state === 'granted') return 'ep.permissions.state.granted';
  if (state === 'denied') return 'ep.permissions.state.denied';
  if (state === 'role') return 'ep.permissions.state.role';
  return 'ep.permissions.state.unset';
}

function stateTone(state: AppPermissionEffectiveState): string {
  if (state === 'granted') return 'border-indigo-200 bg-indigo-50 text-indigo-800';
  if (state === 'denied') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (state === 'role') return 'border-slate-200 bg-slate-50 text-slate-700';
  return 'border-slate-100 bg-white text-slate-500';
}

export function StaffAccessMyLauncherView({
  accessInput,
  canManage,
  onSwitchToAdmin,
}: Props): React.JSX.Element {
  const translate = useTranslate();
  const apps = useMemo(() => listAssignablePublishedApps(), []);

  return (
    <div className="space-y-4" data-testid="staff-access-my-view">
      {canManage && onSwitchToAdmin ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="min-h-11 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
          >
            {translate('ep.staffAccess.switchToAdmin')}
          </button>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => {
          const state = describeAppPermissionEffectiveState(app.id, accessInput);
          const available = state === 'granted' || state === 'role';
          return (
            <div
              key={app.id}
              className={`rounded-2xl border p-3.5 ${stateTone(state)}`}
              data-testid={`staff-access-my-app-${app.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{app.label}</p>
                  <p className="mt-1 text-[11px] font-semibold">
                    {available
                      ? translate('ep.staffAccess.state.available')
                      : translate(stateLabelKey(state))}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {translate(stateLabelKey(state))}
                  </p>
                </div>
                {available ? (
                  <Link
                    to={app.path}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 min-h-9 inline-flex items-center"
                  >
                    {translate('ep.staffAccess.my.openApp')}
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-snug text-slate-600">
        {translate('ep.staffAccess.my.hint')}
      </p>
      <button
        type="button"
        disabled
        className="min-h-11 w-full rounded-xl border border-dashed border-slate-200 px-4 text-xs font-semibold text-slate-400"
        title={translate('ep.staffAccess.my.requestStub')}
      >
        {translate('ep.staffAccess.my.requestStub')}
      </button>
      {canManage ? (
        <Link
          to={buildStaffAccessPath({ mode: 'admin' })}
          className="sr-only"
        >
          {translate('ep.staffAccess.switchToAdmin')}
        </Link>
      ) : null}
    </div>
  );
}
