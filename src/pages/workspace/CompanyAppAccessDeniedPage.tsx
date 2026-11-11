import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslate } from '@refinedev/core';
import { AccessDeniedBanner } from '@/pages/settings/DynamicRoleSettingsPage';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { Button } from '@/shared/components/ui/Button';
import { StorageService } from '@/services/storage';
import { canManageRoles } from '@/domain/permissions';
import { getPublishedCompanyApp, type PublishedCompanyAppId } from './publishedCompanyApps';

type Props = {
  appId: PublishedCompanyAppId;
};

/** URL 직접 진입 시 권한 없음 — 조용한 리다이렉트 대신 안내 */
export function CompanyAppAccessDeniedPage({ appId }: Props): React.JSX.Element {
  const translate = useTranslate();
  const navigate = useNavigate();
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
        <Button variant="outline" onClick={() => navigate('/workspace/intranet')}>
          {translate('ep.access.denied.backHub')}
        </Button>
        {showAdminLink ? (
          <Button
            variant="primary"
            onClick={() =>
              navigate(
                `/workspace/app-access?app=${encodeURIComponent(appId)}&intent=grant&mode=admin`,
              )
            }
          >
            {translate('ep.access.denied.manageMembers')}
          </Button>
        ) : null}
      </div>
    </WorkPageFrame>
  );
}
