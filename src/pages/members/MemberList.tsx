import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CanAccess, useTranslate } from '@refinedev/core';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserX,
  RefreshCw,
  UserPlus,
  Network,
  KeyRound,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { SearchField } from '@/shared/components/ui/SearchField';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { Button } from '@/shared/components/ui/Button';
import { ContentFadeIn } from '@/shared/components/ui/ContentFadeIn';
import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import {
  assignOrganizationRole,
  type DynamicMemberRow,
} from '@/core/organizations/services/dynamicRoleService';
import { listAuditLogs } from '@/core/audit';
import type { AuditLog } from '@/core/audit/types';
import { StorageService } from '@/services/storage';
import {
  canApproveMemberJoins,
  canManageOrgStructure,
  canManageRoles,
  normalizeRolePermissions,
} from '@/domain/permissions';
import { isOrgAdmin } from '@/core/auth/permissionsRole';
import { resolveActiveCapabilityIds } from '@/domain/permissionVisibility';
import { MemberRoleAssignModal } from '@/pages/members/MemberRoleAssignModal';
import { MemberRoleRevokeConfirmModal } from '@/pages/members/MemberRoleRevokeConfirmModal';
import { MemberProvisionModal } from '@/pages/members/MemberProvisionModal';
import { useOrgMembersDirectory } from '@/pages/members/useOrgMembersDirectory';
import { StaffAccessMemberSheet } from '@/pages/workspace/staffAccess/StaffAccessMemberSheet';
import { StaffAccessAppHomeView } from '@/pages/workspace/staffAccess/StaffAccessAppHomeView';
import { useOrganizationTree } from '@/pages/organization/useOrganizationTree';
import { listEnabledPermissionLabels } from '@/domain/permissionCatalog';
import type { AdminMemberDirectoryRow } from '@/core/organizations/services/orgMemberAdminService';
import { summarizeMemberEffectiveAccess } from '@/core/organizations/services/orgMemberAdminService';

type HubTab = 'list' | 'org' | 'apps' | 'roles';

function formatAuditAction(action: string): string {
  if (action === 'ROLE_ASSIGNED') return '직급 부여';
  if (action === 'ROLE_REVOKED') return '권한 회수';
  return action;
}

function memberLabel(member: DynamicMemberRow): string {
  return member.name || member.login_id || member.email || `사원 (${member.user_id.slice(0, 8)})`;
}

export function MemberList(): React.JSX.Element {
  const translate = useTranslate();
  const { currentOrganization, activeCapabilities, hiddenCapabilities } = useOrganization();
  const { role: callerRole } = useAuthorization();
  const orgId = currentOrganization?.id ?? '';
  const scopedCapIds = useMemo(
    () => resolveActiveCapabilityIds(activeCapabilities, hiddenCapabilities),
    [activeCapabilities, hiddenCapabilities]
  );

  const activeUser = StorageService.getActiveUser();
  const accessMember = {
    role: activeUser?.role ?? callerRole,
    permissions: normalizeRolePermissions(activeUser?.customRole?.permissions ?? null) ?? undefined,
    customRole: activeUser?.customRole ?? null,
  };
  const canManage = canManageRoles(accessMember);
  const canProvision = canApproveMemberJoins(accessMember) || canManage;
  const canStructure = canManageOrgStructure(accessMember);
  const canViewRoleAudit = callerRole === 'owner' || canManage;

  const { members, setMembers, roles, loading, error, setError, reload } = useOrgMembersDirectory({
    orgId,
    enabled: Boolean(orgId),
  });
  const tree = useOrganizationTree(orgId || null);

  const [hubTab, setHubTab] = useState<HubTab>('list');
  const [search, setSearch] = useState('');
  const [sheetMemberId, setSheetMemberId] = useState<string | null>(null);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [roleAuditLogs, setRoleAuditLogs] = useState<AuditLog[]>([]);

  const [assignTarget, setAssignTarget] = useState<DynamicMemberRow | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<DynamicMemberRow | null>(null);

  useEffect(() => {
    if (!orgId || !canViewRoleAudit) {
      setRoleAuditLogs([]);
      return;
    }
    void listAuditLogs({
      organizationId: orgId,
      entityType: 'permissions',
      limit: 20,
    })
      .then((logs) =>
        setRoleAuditLogs(
          logs.filter(
            (log) =>
              log.action === 'ROLE_ASSIGNED' ||
              log.action === 'ROLE_REVOKED' ||
              log.action === 'role_changed' ||
              log.action === 'granted' ||
              log.action === 'revoked'
          )
        )
      )
      .catch(() => setRoleAuditLogs([]));
  }, [orgId, canViewRoleAudit, members.length]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const roleName = roles.find((r) => r.id === m.organization_role_id)?.name.toLowerCase() ?? '';
      return (
        m.user_id.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.login_id?.toLowerCase().includes(q) ||
        m.name?.toLowerCase().includes(q) ||
        m.department_name?.toLowerCase().includes(q) ||
        roleName.includes(q)
      );
    });
  }, [members, roles, search]);

  const sheetMember = useMemo(
    () => members.find((m) => m.id === sheetMemberId) ?? null,
    [members, sheetMemberId]
  );

  async function handleAssignRole() {
    if (!assignTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      await assignOrganizationRole(
        assignTarget.id,
        selectedRoleId || null,
        assignReason.trim() || '총무/운영 위임 관리자 직급 부여'
      );
      setSuccessMessage(`${memberLabel(assignTarget)} 님에게 직급이 부여되었습니다.`);
      setAssignTarget(null);
      setSelectedRoleId('');
      setAssignReason('');
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '직급 부여 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeRole() {
    if (!revokeTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      await assignOrganizationRole(revokeTarget.id, null, '권한 회수 (기본 사원으로 강등)');
      setSuccessMessage(`${memberLabel(revokeTarget)} 님의 권한이 회수되었습니다.`);
      setRevokeTarget(null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '권한 회수 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleMemberUpdated(updated: DynamicMemberRow) {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== updated.id) return m;
        const role = roles.find((r) => r.id === updated.organization_role_id);
        const merged: AdminMemberDirectoryRow = {
          ...m,
          ...updated,
          roleName: role?.name ?? m.roleName ?? null,
          appSummary: summarizeMemberEffectiveAccess(updated, role),
        };
        return merged;
      })
    );
  }

  const tabOptions = [
    { value: 'list' as const, label: '목록' },
    { value: 'org' as const, label: '조직 배치' },
    { value: 'apps' as const, label: '앱 이용' },
    { value: 'roles' as const, label: '직급·RBAC' },
  ];

  return (
    <WorkPageFrame width="hub" data-testid="member-list-page" progressActive={loading}>
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title={translate('ep.members.title')}
        description={translate('ep.members.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canProvision ? (
              <Button
                type="button"
                onClick={() => setProvisionOpen(true)}
                data-testid="member-provision-open"
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                임직원 등록
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => void reload()} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {translate('ep.members.refresh')}
            </Button>
          </div>
        }
      />
      <p className="mt-1 text-[11px] text-slate-500">{translate('ep.members.adminAppHint')}</p>
      <p className="mt-1 text-xs font-semibold text-slate-600">
        {translate('ep.members.count', { count: members.length })}
      </p>

      <div className="mt-4">
        <SegmentedControl
          value={hubTab}
          onChange={setHubTab}
          options={tabOptions}
          aria-label="임직원 관리 탭"
        />
      </div>

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

      {successMessage ? (
        <div
          role="status"
          className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {successMessage}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setSuccessMessage(null)}>
            ×
          </Button>
        </div>
      ) : null}

      <div className="mt-4">
        <ContentFadeIn motionKey={hubTab}>
          {hubTab === 'list' ? (
            <div className="space-y-3">
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder={translate('ep.members.searchPlaceholder')}
              />
              {loading && members.length === 0 ? (
                <PageListSkeleton rows={5} message={translate('ep.members.refresh')} />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                        <tr>
                          <th className="px-4 py-3">{translate('ep.members.col.employee')}</th>
                          <th className="px-4 py-3">소속</th>
                          <th className="px-4 py-3">{translate('ep.members.col.assignedRole')}</th>
                          <th className="px-4 py-3">{translate('ep.members.col.appAccess')}</th>
                          <th className="px-4 py-3">{translate('ep.members.col.status')}</th>
                          <th className="px-4 py-3 text-right">{translate('ep.members.col.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMembers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400">
                              검색 결과가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          filteredMembers.map((member) => {
                            const isOwner = member.role === 'owner';
                            return (
                              <tr key={member.id} className="transition-colors hover:bg-slate-50/60">
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    className="text-left"
                                    onClick={() => setSheetMemberId(member.id)}
                                  >
                                    <p className="font-bold text-slate-900">{memberLabel(member)}</p>
                                    <p className="font-mono text-[11px] text-slate-500">
                                      {member.login_id || member.email || member.user_id.slice(0, 13)}
                                    </p>
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                                  {member.department_name || (
                                    <span className="text-slate-400">미배치</span>
                                  )}
                                  {member.department_scope_type === 'DESCENDANTS' ? (
                                    <span className="mt-0.5 block text-[10px] font-bold text-indigo-600">
                                      리더
                                    </span>
                                  ) : null}
                                </td>
                                <td className="px-4 py-3">
                                  {member.roleName ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                                      <ShieldCheck className="h-3 w-3" />
                                      {member.roleName}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400">미배정</span>
                                  )}
                                  <p className="mt-0.5 text-[10px] text-slate-500">
                                    {isOwner
                                      ? '대표이사'
                                      : member.role === 'admin'
                                        ? '관리자'
                                        : member.role === 'manager'
                                          ? '매니저'
                                          : '일반 직원'}
                                  </p>
                                </td>
                                <td className="px-4 py-3">
                                  {isOrgAdmin(member.role) ? (
                                    <span className="text-xs font-bold text-slate-700">
                                      {translate('ep.members.appAccessAdmin')}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-700">
                                      {translate('ep.members.appAccessCount', {
                                        n: member.appSummary.granted,
                                        total: member.appSummary.total,
                                      })}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {member.is_active !== false ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                      활성
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                      비활성
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <CanAccess
                                    resource="members"
                                    action="assign_role"
                                    fallback={
                                      <span className="text-xs font-medium text-slate-400">조회 전용</span>
                                    }
                                  >
                                    {isOwner ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                                        보호
                                      </span>
                                    ) : (
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setSheetMemberId(member.id)}
                                        >
                                          <Shield className="mr-1 h-3.5 w-3.5" />
                                          {translate('ep.members.action.appPerm')}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() => {
                                            setAssignTarget(member);
                                            setSelectedRoleId(member.organization_role_id ?? '');
                                            setAssignReason('');
                                          }}
                                        >
                                          {member.organization_role_id
                                            ? translate('ep.members.action.changeRole')
                                            : translate('ep.members.action.assignRole')}
                                        </Button>
                                        {member.organization_role_id ? (
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setRevokeTarget(member)}
                                          >
                                            <UserX className="h-3.5 w-3.5 text-rose-600" />
                                          </Button>
                                        ) : null}
                                      </div>
                                    )}
                                  </CanAccess>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {canViewRoleAudit ? (
                <section
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                  data-testid="role-delegation-audit"
                >
                  <h2 className="text-base font-bold text-slate-900">최근 직급 부여·회수 이력</h2>
                  {roleAuditLogs.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-400">최근 이력이 없습니다.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-slate-100">
                      {roleAuditLogs.map((log) => {
                        const after = log.afterData ?? {};
                        const targetId =
                          typeof after.target_member_id === 'string'
                            ? after.target_member_id
                            : log.entityId;
                        const targetMember = members.find((m) => m.id === targetId);
                        const roleId =
                          typeof after.assigned_role_id === 'string' ? after.assigned_role_id : null;
                        const roleName = roleId
                          ? roles.find((r) => r.id === roleId)?.name
                          : null;
                        return (
                          <li key={log.id} className="py-2.5 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                {formatAuditAction(log.action)}
                              </span>
                              <span className="font-semibold text-slate-900">
                                {targetMember ? memberLabel(targetMember) : '대상 미상'}
                              </span>
                              {roleName ? (
                                <span className="text-xs text-indigo-700">→ {roleName}</span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {new Date(log.createdAt).toLocaleString('ko-KR')}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              ) : null}
            </div>
          ) : null}

          {hubTab === 'org' ? (
            <div className="space-y-3" data-testid="members-hub-org-tab">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">조직 배치</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      부서 {tree.nodes.length}개 · 배치 {tree.departmentMembers.length}건
                    </p>
                  </div>
                  <Link
                    to="/workspace/organization"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white"
                  >
                    <Network className="h-4 w-4" />
                    {canStructure ? '조직도에서 편집' : '조직도 보기'}
                  </Link>
                </div>
                <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                  {tree.nodes.length === 0 ? (
                    <li className="text-sm text-slate-400">등록된 부서가 없습니다.</li>
                  ) : (
                    [...tree.nodes]
                      .sort((a, b) => a.path.localeCompare(b.path))
                      .map((node) => {
                        const placed = tree.departmentMembers.filter(
                          (dm) => dm.department_id === node.id
                        ).length;
                        return (
                          <li
                            key={node.id}
                            className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm"
                          >
                            <span className="font-semibold text-slate-800">
                              {node.unitKind ? `${node.unitKind} · ` : ''}
                              {node.name}
                            </span>
                            <span className="text-xs text-slate-500">{placed}명</span>
                          </li>
                        );
                      })
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                소속이 비어 있는 임직원은 목록 탭에서 확인한 뒤, 조직도에서 배치하세요.
                {!canStructure
                  ? ' (조직도 편집 권한이 없으면 조회만 가능합니다.)'
                  : ''}
              </div>
            </div>
          ) : null}

          {hubTab === 'apps' ? (
            <div data-testid="members-hub-apps-tab">
              {loading ? (
                <PageListSkeleton rows={4} />
              ) : (
                <StaffAccessAppHomeView
                  members={members}
                  onError={setError}
                  onMembersUpdated={(updater) => {
                    setMembers((prev) => {
                      const asDyn = updater(prev);
                      return asDyn.map((row) => {
                        const role = roles.find((r) => r.id === row.organization_role_id);
                        return {
                          ...(row as AdminMemberDirectoryRow),
                          roleName:
                            (row as AdminMemberDirectoryRow).roleName ?? role?.name ?? null,
                          appSummary:
                            (row as AdminMemberDirectoryRow).appSummary ??
                            summarizeMemberEffectiveAccess(row, role),
                        };
                      });
                    });
                  }}
                  onOpenMember={(memberId) => {
                    setSheetMemberId(memberId);
                  }}
                />
              )}
            </div>
          ) : null}

          {hubTab === 'roles' ? (
            <div className="space-y-4" data-testid="members-hub-roles-tab">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">직급 템플릿</h2>
                  <p className="text-xs text-slate-500">
                    직급별 위임 권한은 설정 화면에서 편집합니다.
                  </p>
                </div>
                <Link
                  to="/workspace/settings/roles"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white"
                >
                  <KeyRound className="h-4 w-4" />
                  직급·권한 설정
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {roles.map((role) => {
                  const labels = listEnabledPermissionLabels(role.permissions, scopedCapIds);
                  const assigneeCount = members.filter(
                    (m) => m.organization_role_id === role.id
                  ).length;
                  return (
                    <div
                      key={role.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                    >
                      <p className="font-bold text-slate-900">{role.name}</p>
                      <p className="mt-1 text-xs text-slate-500">배정 {assigneeCount}명</p>
                      <ul className="mt-2 space-y-0.5">
                        {labels.slice(0, 6).map((item) => (
                          <li key={item.key} className="text-[11px] text-slate-600">
                            · {item.label}
                          </li>
                        ))}
                        {labels.length > 6 ? (
                          <li className="text-[11px] text-slate-400">외 {labels.length - 6}개</li>
                        ) : null}
                        {labels.length === 0 ? (
                          <li className="text-[11px] text-slate-400">위임 권한 없음</li>
                        ) : null}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </ContentFadeIn>
      </div>

      <StaffAccessMemberSheet
        member={canManage ? sheetMember : null}
        selfUserId={activeUser?.id ?? null}
        onClose={() => setSheetMemberId(null)}
        onError={setError}
        onMemberUpdated={handleMemberUpdated}
      />

      <MemberProvisionModal
        open={provisionOpen}
        organizationId={orgId}
        roles={roles}
        departments={tree.nodes}
        onClose={() => setProvisionOpen(false)}
        onProvisioned={() => {
          void reload();
        }}
      />

      <MemberRoleAssignModal
        member={assignTarget}
        roles={roles}
        selectedRoleId={selectedRoleId}
        assignReason={assignReason}
        submitting={submitting}
        scopedCapIds={scopedCapIds}
        onSelectedRoleIdChange={setSelectedRoleId}
        onAssignReasonChange={setAssignReason}
        onClose={() => setAssignTarget(null)}
        onSubmit={() => void handleAssignRole()}
      />

      <MemberRoleRevokeConfirmModal
        member={revokeTarget}
        submitting={submitting}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => void handleRevokeRole()}
      />
    </WorkPageFrame>
  );
}
