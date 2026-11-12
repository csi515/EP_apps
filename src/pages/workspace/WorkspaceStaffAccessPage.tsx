import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslate } from '@refinedev/core';
import { KeyRound } from 'lucide-react';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { ContentFadeIn } from '@/shared/components/ui/ContentFadeIn';
import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import { canManageRoles } from '@/domain/permissions';
import {
  buildCompanyAppAccessInputFromStorageUser,
} from '@/pages/workspace/companyAppAccess';
import type { PublishedCompanyAppId } from '@/pages/workspace/publishedCompanyApps';
import { useOrgMembersDirectory } from '@/pages/members/useOrgMembersDirectory';
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import { StaffAccessMyLauncherView } from './staffAccess/StaffAccessMyLauncherView';
import { StaffAccessAppHomeView } from './staffAccess/StaffAccessAppHomeView';
import { StaffAccessMemberSheet } from './staffAccess/StaffAccessMemberSheet';
import {
  buildStaffAccessPath,
  parseStaffAccessSearch,
  type StaffAccessViewMode,
} from './staffAccess/staffAccessNav';

/** 앱 권한 회사 앱 — 직원 읽기 / 관리자 배정 */
export const WorkspaceStaffAccessPage: React.FC = () => {
  const translate = useTranslate();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const activeUser = StorageService.getActiveUser();
  const canManage = canManageRoles(activeUser);
  const accessInput = useMemo(
    () => buildCompanyAppAccessInputFromStorageUser(activeUser),
    [activeUser]
  );

  const nav = useMemo(() => parseStaffAccessSearch(location.search), [location.search]);
  const { members, setMembers, loading, error, setError, reload } = useOrgMembersDirectory({
    orgId,
    enabled: canManage,
  });

  const [modeOverride, setModeOverride] = useState<StaffAccessViewMode | null>(null);
  const viewMode: StaffAccessViewMode =
    modeOverride ?? nav.mode ?? (canManage ? 'admin' : 'mine');

  const sheetMember = useMemo(() => {
    if (!nav.memberId) return null;
    return members.find((m) => m.id === nav.memberId) ?? null;
  }, [members, nav.memberId]);

  function goNav(next: {
    appId?: PublishedCompanyAppId | null;
    memberId?: string | null;
    intent?: 'grant' | null;
    mode?: StaffAccessViewMode | null;
  }) {
    navigate(
      buildStaffAccessPath({
        appId: next.appId === undefined ? nav.appId : next.appId,
        memberId: next.memberId === undefined ? nav.memberId : next.memberId,
        intent: next.intent === undefined ? nav.intent : next.intent,
        mode: next.mode === undefined ? (modeOverride ?? nav.mode) : next.mode,
      }),
      { replace: false }
    );
  }

  function handleMemberUpdated(updated: DynamicMemberRow) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === updated.id
          ? {
              ...m,
              ...updated,
              roleName: m.roleName,
              appSummary: m.appSummary,
            }
          : m
      )
    );
  }

  return (
    <WorkPageFrame
      width="hub"
      data-testid="workspace-staff-access"
      progressActive={canManage && loading}
    >
      <PageHeader
        icon={<KeyRound className="h-5 w-5" />}
        title={translate('ep.staffAccess.title')}
        description={translate('ep.staffAccess.subtitle')}
      />

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>
            ×
          </Button>
        </div>
      ) : null}

      <div className="mt-4">
        <ContentFadeIn motionKey={viewMode}>
          {viewMode === 'mine' || !canManage ? (
            <StaffAccessMyLauncherView
              accessInput={accessInput}
              canManage={canManage}
              onSwitchToAdmin={() => {
                setModeOverride('admin');
                goNav({ mode: 'admin', memberId: null });
              }}
            />
          ) : (
            <>
              {loading ? (
                <PageListSkeleton rows={4} message={translate('ep.members.refresh')} />
              ) : (
                <StaffAccessAppHomeView
                  members={members}
                  initialAppId={nav.appId}
                  intentGrant={nav.intent === 'grant'}
                  onError={setError}
                  onMembersUpdated={(updater) => {
                    setMembers((prev) =>
                      updater(prev).map((row) => {
                        const existing = prev.find((m) => m.id === row.id);
                        return {
                          ...row,
                          roleName: existing?.roleName ?? null,
                          appSummary: existing?.appSummary ?? {
                            granted: 0,
                            total: 0,
                            byApp: [],
                          },
                        };
                      })
                    );
                  }}
                  onOpenMember={(memberId, appId) => {
                    goNav({ memberId, appId, mode: 'admin' });
                  }}
                  onSwitchToMine={() => {
                    setModeOverride('mine');
                    goNav({ mode: 'mine', memberId: null });
                  }}
                />
              )}
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => void reload()}>
                  {translate('ep.members.refresh')}
                </Button>
              </div>
            </>
          )}
        </ContentFadeIn>
      </div>

      <StaffAccessMemberSheet
        member={canManage ? sheetMember : null}
        selfUserId={activeUser?.id ?? null}
        onClose={() => goNav({ memberId: null })}
        onError={setError}
        onMemberUpdated={handleMemberUpdated}
      />
    </WorkPageFrame>
  );
};
