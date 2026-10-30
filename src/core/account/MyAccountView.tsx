import React, { useMemo, useState } from 'react';
import { ArrowLeft, KeyRound, Shield, User } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { Button, SettingsCard } from '@/shared/components/ui';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { getRoleLabel } from '@/core/organizations/services/organizationService';
import { listEnabledPermissionLabels } from '@/domain/permissionCatalog';
import { PasswordChangeCard } from './PasswordChangeCard';

import { COMPANY_APP_ACCESS_LABELS } from '@/pages/workspace/companyAppAccess';

const FEATURE_PERMISSION_LABELS: Record<string, string> = COMPANY_APP_ACCESS_LABELS;

/** 로그인 사용자 공통 계정 관리 (프로필·비밀번호·법적 고지) */
export const MyAccountView: React.FC = () => {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const activeUser = useActiveUser();
  const org = useOptionalOrganization();

  const industry =
    org?.selectedMembership?.organization.industry_type ??
    org?.currentOrganization?.industry_type ??
    null;

  const roleLabel = useMemo(() => {
    const customName = activeUser.customRole?.name?.trim()
      || org?.selectedMembership?.organizationRoleName?.trim();
    if (customName) return customName;
    const role = org?.selectedMembership?.role ?? activeUser.role;
    return role ? getRoleLabel(role, industry) : '—';
  }, [activeUser.customRole?.name, activeUser.role, industry, org?.selectedMembership]);

  const permissionLabels = useMemo(() => {
    const scopedCaps = org?.activeCapabilities ?? null;
    const rolePermsRaw =
      activeUser.customRole?.permissions ??
      org?.selectedMembership?.permissions ??
      null;
    const rolePerms =
      rolePermsRaw == null
        ? null
        : Array.isArray(rolePermsRaw)
          ? Object.fromEntries(rolePermsRaw.map((key) => [key, true as const]))
          : rolePermsRaw;
    const fromRole = listEnabledPermissionLabels(rolePerms, scopedCaps).map((item) => item.label);

    const featureSource =
      activeUser.feature_permissions ??
      org?.selectedMembership?.featurePermissions ??
      {};
    const fromFeatures = Object.entries(featureSource)
      .filter(([key, enabled]) => Boolean(enabled) && FEATURE_PERMISSION_LABELS[key])
      .map(([key]) => FEATURE_PERMISSION_LABELS[key]);

    return Array.from(new Set([...fromRole, ...fromFeatures]));
  }, [
    activeUser.customRole?.permissions,
    activeUser.feature_permissions,
    org?.activeCapabilities,
    org?.selectedMembership?.featurePermissions,
    org?.selectedMembership?.permissions,
  ]);

  const displayName = activeUser.name?.trim() || '사용자';
  const email = activeUser.email?.trim() || '';

  if (showPasswordChange) {
    return (
      <WorkPageFrame width="form">
        <PageHeader
          icon={<KeyRound className="h-5 w-5" />}
          title="비밀번호 변경"
          description="현재 비밀번호 확인 후 새 비밀번호를 설정합니다"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => setShowPasswordChange(false)}
        >
          내 계정으로 돌아가기
        </Button>
        <PasswordChangeCard />
      </WorkPageFrame>
    );
  }

  return (
    <WorkPageFrame width="form">
      <PageHeader
        icon={<User className="h-5 w-5" />}
        title="내 계정"
        description="프로필 확인 및 비밀번호 관리"
      />

      <SettingsCard title="프로필" icon={<User className="w-4 h-4 text-indigo-600" />}>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">이름</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">{displayName}</dd>
          </div>
          {email ? (
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                로그인 계정
              </dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700 break-all">{email}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">직급</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">{roleLabel}</dd>
          </div>
        </dl>
      </SettingsCard>

      <SettingsCard title="보유 권한" icon={<Shield className="w-4 h-4 text-indigo-600" />}>
        {permissionLabels.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {permissionLabels.map((label) => (
              <li
                key={label}
                className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 min-h-[44px] inline-flex items-center"
              >
                {label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500 leading-relaxed">
            표시할 개별 권한이 없습니다. 기본 직급 권한으로 이용 중입니다.
          </p>
        )}
      </SettingsCard>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        leftIcon={<KeyRound className="h-4 w-4" />}
        onClick={() => setShowPasswordChange(true)}
      >
        비밀번호 변경
      </Button>
    </WorkPageFrame>
  );
};
