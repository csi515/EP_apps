import React from 'react';
import { StorageService } from '@/services/storage';
import {
  buildCompanyAppAccessInputFromStorageUser,
  canAccessCompanyApp,
} from './companyAppAccess';
import { CompanyAppAccessDeniedPage } from './CompanyAppAccessDeniedPage';
import type { PublishedCompanyAppId } from './publishedCompanyApps';

type Props = {
  appId: PublishedCompanyAppId;
  children: React.ReactNode;
};

/** URL 직접 입력 차단 — 런처와 동일한 앱 접근 규칙. 거부 시 안내 화면 */
export function CompanyAppAccessGate({
  appId,
  children,
}: Props): React.JSX.Element {
  const activeUser = StorageService.getActiveUser();
  const access = buildCompanyAppAccessInputFromStorageUser(activeUser);

  if (canAccessCompanyApp(appId, access)) {
    return <>{children}</>;
  }

  return <CompanyAppAccessDeniedPage appId={appId} />;
}
