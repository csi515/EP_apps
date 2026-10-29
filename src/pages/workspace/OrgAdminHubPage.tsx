import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Building2, Network, Settings, Shield } from 'lucide-react';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import {
  canManageOrgStructure,
  canManageRoles,
  normalizeRolePermissions,
} from '@/domain/permissions';

type HubCard = {
  id: string;
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  visible: boolean;
};

/** 조직도·직급·사업장 설정 진입 허브 (권한자 전용) */
export const OrgAdminHubPage: React.FC = () => {
  const { isAdmin, isOwner } = usePermissions();
  const org = useOptionalOrganization();
  const membership = org?.selectedMembership;
  const accessMember = {
    role: membership?.role ?? (isOwner ? 'owner' : isAdmin ? 'admin' : null),
    permissions: normalizeRolePermissions(membership?.permissions ?? null) ?? undefined,
    customRole: membership?.organizationRoleName
      ? {
          name: membership.organizationRoleName,
          permissions: normalizeRolePermissions(membership?.permissions ?? null) ?? undefined,
        }
      : null,
  };

  const canStructure = canManageOrgStructure(accessMember);
  const canRoles = canManageRoles(accessMember);
  const canOpen = canStructure || canRoles;

  if (!canOpen) {
    return <Navigate to="/workspace" replace />;
  }

  const cards: HubCard[] = [
    {
      id: 'org-tree',
      to: '/workspace/organization',
      title: '조직도',
      description: '부서 트리와 인원 배치를 구성합니다.',
      icon: <Network className="h-5 w-5" />,
      visible: canStructure,
    },
    {
      id: 'roles',
      to: '/workspace/settings/roles',
      title: '직급·권한',
      description: '역할과 권한 위임을 관리합니다.',
      icon: <Shield className="h-5 w-5" />,
      visible: canRoles,
    },
    {
      id: 'workplace',
      to: '/workspace/settings',
      title: '사업장 설정',
      description: '사업장 프로필·메뉴 표시를 조정합니다.',
      icon: <Settings className="h-5 w-5" />,
      visible: canStructure || canRoles,
    },
  ].filter((c) => c.visible);

  return (
    <WorkPageFrame width="hub">
      <PageHeader
        icon={<Building2 className="h-5 w-5" />}
        title="조직 설정"
        description="조직도, 직급·권한, 사업장 운영 설정에 접근합니다."
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.id}
            to={card.to}
            data-testid={`org-admin-card-${card.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-indigo-200 hover:bg-indigo-50/40 min-h-[44px]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              {card.icon}
            </div>
            <h2 className="mt-3 text-sm font-bold text-slate-900">{card.title}</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">{card.description}</p>
          </Link>
        ))}
      </div>
    </WorkPageFrame>
  );
};
