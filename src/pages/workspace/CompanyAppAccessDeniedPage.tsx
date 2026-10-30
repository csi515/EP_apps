import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslate } from '@refinedev/core';
import { AccessDeniedBanner } from '@/pages/settings/DynamicRoleSettingsPage';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { StorageService } from '@/services/storage';
import { canManageRoles } from '@/domain/permissions';
import { getPublishedCompanyApp, type PublishedCompanyAppId } from './publishedCompanyApps';

type Props = {
  appId: PublishedCompanyAppId;
};

/** URL 직접 진입 시 권한 없음 — 조용한 리다이렉트 대신 안내 */
export function CompanyAppAccessDeniedPage({ appId }: Props): React.JSX.Element {
  const translate = useTranslate();
  const app = getPublishedCompanyApp(appId);
  const activeUser = StorageService.getActiveUser();
  const showAdminLink = canManageRoles(activeUser);

  return (
    <WorkPageFrame width="form" as="main" data-testid="company-app-access-denied">
      <AccessDeniedBanner />
      <p className="mt-3 text-center text-sm text-slate-600">
        {translate('ep.access.denied.body', { appName: app.label })}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/workspace/intranet"
          className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          {translate('ep.access.denied.backHub')}
        </Link>
        {showAdminLink ? (
          <Link
            to="/workspace/members"
            className="inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700"
          >
            {translate('ep.access.denied.manageMembers')}
          </Link>
        ) : null}
      </div>
    </WorkPageFrame>
  );
}
