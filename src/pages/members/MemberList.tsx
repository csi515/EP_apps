import React, { useEffect, useState, useMemo } from 'react';
import { CanAccess, useTranslate } from '@refinedev/core';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserX,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import {
  listDynamicRoles,
  listRoleMembers,
  assignOrganizationRole,
  type DynamicMemberRow,
  type DynamicRoleRow,
} from '@/core/organizations/services/dynamicRoleService';
import { listAuditLogs } from '@/core/audit';
import type { AuditLog } from '@/core/audit/types';
import { StorageService } from '@/services/storage';
import { canManageRoles } from '@/domain/permissions';
import { isOrgAdmin } from '@/core/auth/permissionsRole';
import { resolveActiveCapabilityIds } from '@/domain/permissionVisibility';
import {
  COMPANY_APP_FEATURE_ASSIGNMENT_OPTIONS,
  COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS,
  countGrantedCompanyAppUsage,
} from '@/pages/workspace/companyAppAccess';
import { FEATURE_OPTION_I18N } from '@/core/i18n/epAppsMessages';
import { MemberAppAccessBulkModal } from '@/pages/members/MemberAppAccessBulkModal';
import { MemberFeaturePermissionModal } from '@/pages/members/MemberFeaturePermissionModal';
import { MemberRoleAssignModal } from '@/pages/members/MemberRoleAssignModal';
import { MemberRoleRevokeConfirmModal } from '@/pages/members/MemberRoleRevokeConfirmModal';

function formatAuditAction(action: string): string {
  if (action === 'ROLE_ASSIGNED') return '직급 부여';
  if (action === 'ROLE_REVOKED') return '권한 회수';
  return action;
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

  const [members, setMembers] = useState<DynamicMemberRow[]>([]);
  const [roles, setRoles] = useState<DynamicRoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleAuditLogs, setRoleAuditLogs] = useState<AuditLog[]>([]);

  const [assignTarget, setAssignTarget] = useState<DynamicMemberRow | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [assignReason, setAssignReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<DynamicMemberRow | null>(null);

  const [featureTarget, setFeatureTarget] = useState<DynamicMemberRow | null>(null);
  const [bulkAppAccessOpen, setBulkAppAccessOpen] = useState(false);

  const FEATURE_ASSIGNMENT_OPTIONS = COMPANY_APP_FEATURE_ASSIGNMENT_OPTIONS;
  const appUsageTotal = COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.length;

  const activeUser = StorageService.getActiveUser();
  const canViewRoleAudit =
    callerRole === 'owner' || canManageRoles(activeUser);

  async function loadData() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [fetchedRoles, fetchedMembers] = await Promise.all([
        listDynamicRoles(orgId),
        listRoleMembers(orgId),
      ]);
      setRoles(fetchedRoles);
      setMembers(fetchedMembers);

      if (canViewRoleAudit) {
        try {
          const logs = await listAuditLogs({
            organizationId: orgId,
            entityType: 'permissions',
            limit: 20,
          });
          setRoleAuditLogs(
            logs.filter(
              (log) =>
                log.action === 'ROLE_ASSIGNED' ||
                log.action === 'ROLE_REVOKED' ||
                log.action === 'role_changed' ||
                log.action === 'granted' ||
                log.action === 'revoked'
            )
          );
        } catch {
          setRoleAuditLogs([]);
        }
      } else {
        setRoleAuditLogs([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [orgId]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const idMatch = m.user_id.toLowerCase().includes(q);
      const emailMatch = m.email?.toLowerCase().includes(q);
      const nameMatch = m.name?.toLowerCase().includes(q);
      const roleName = roles.find((r) => r.id === m.organization_role_id)?.name.toLowerCase() ?? '';
      return idMatch || emailMatch || nameMatch || roleName.includes(q);
    });
  }, [members, roles, search]);

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
      setSuccessMessage(`${assignTarget.name || assignTarget.user_id.slice(0, 8)} 님의 직급이 성공적으로 부여되었습니다.`);
      setAssignTarget(null);
      setSelectedRoleId('');
      setAssignReason('');
      await loadData();
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
      await assignOrganizationRole(
        revokeTarget.id,
        null,
        '권한 회수 (기본 사원으로 강등 및 세션 즉시 만료)'
      );
      setSuccessMessage(`${revokeTarget.name || revokeTarget.user_id.slice(0, 8)} 님의 권한이 회수되었으며 세션이 즉시 만료되었습니다.`);
      setRevokeTarget(null);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '권한 회수 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkPageFrame width="hub" data-testid="member-list-page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-slate-800" />
            <h1 className="text-2xl font-black text-slate-900">{translate('ep.members.title')}</h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {translate('ep.members.count', { count: members.length })}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{translate('ep.members.subtitle')}</p>
          <p className="mt-1 text-[11px] text-slate-500">{translate('ep.members.adminAppHint')}</p>
        </div>

        <div className="flex items-center gap-2">
          <CanAccess resource="members" action="assign_role">
            <button
              type="button"
              onClick={() => setBulkAppAccessOpen(true)}
              className="flex min-h-10 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-800 hover:bg-indigo-100"
            >
              <Users className="h-4 w-4" />
              {translate('ep.members.bulkOpen')}
            </button>
          </CanAccess>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {translate('ep.members.refresh')}
          </button>
        </div>
      </header>

      {/* 상태 알림 배너 */}
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-bold">오류 안내</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="font-bold">처리 완료</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* 검색 바 */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={translate('ep.members.searchPlaceholder')}
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-5 py-3.5">{translate('ep.members.col.employee')}</th>
                <th className="px-5 py-3.5">{translate('ep.members.col.baseRole')}</th>
                <th className="px-5 py-3.5">{translate('ep.members.col.assignedRole')}</th>
                <th className="px-5 py-3.5">{translate('ep.members.col.appAccess')}</th>
                <th className="px-5 py-3.5">{translate('ep.members.col.status')}</th>
                <th className="px-5 py-3.5 text-right">{translate('ep.members.col.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    {loading ? '직원 목록을 불러오는 중입니다...' : '검색 결과가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const assignedRole = roles.find((r) => r.id === member.organization_role_id);
                  const isOwner = member.role === 'owner';
                  const appGrantCount = countGrantedCompanyAppUsage(member.feature_permissions);

                  return (
                    <tr key={member.id} className="transition-colors hover:bg-slate-50/60">
                      {/* 직원 정보 */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
                            {(member.name || member.email || member.user_id)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {member.name || member.email || `사원 (${member.user_id.slice(0, 8)})`}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              ID: {member.user_id.slice(0, 13)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 기본 역할 */}
                      <td className="px-5 py-4">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                            <Shield className="h-3 w-3" />
                            대표이사
                          </span>
                        ) : member.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                            관리자
                          </span>
                        ) : member.role === 'instructor' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                            강사
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            일반 직원
                          </span>
                        )}
                      </td>

                      {/* 배정 직급 */}
                      <td className="px-5 py-4">
                        {assignedRole ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                              <ShieldCheck className="h-3 w-3 text-indigo-600" />
                              {assignedRole.name}
                            </span>
                            <span className="block text-[11px] text-slate-400">
                              {assignedRole.description || '지정 직급'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                            미배정 (기본 사원)
                          </span>
                        )}
                        {member.feature_permissions && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {Object.entries(member.feature_permissions)
                              .filter(([, enabled]) => Boolean(enabled))
                              .map(([k]) => {
                                const opt = FEATURE_ASSIGNMENT_OPTIONS.find((f) => f.key === k);
                                if (!opt) return null;
                                const chip = FEATURE_OPTION_I18N[k];
                                return (
                                  <span
                                    key={k}
                                    className="inline-flex items-center rounded-md border border-indigo-200/60 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700"
                                  >
                                    {chip
                                      ? translate(chip.chipKey, opt.label)
                                      : translate(opt.chipKey, opt.label)}
                                  </span>
                                );
                              })}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {isOrgAdmin(member.role) ? (
                          <span className="text-xs font-bold text-slate-700">
                            {translate('ep.members.appAccessAdmin')}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-700">
                            {translate('ep.members.appAccessCount', {
                              n: appGrantCount,
                              total: appUsageTotal,
                            })}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
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

                      {/* 권한 관리 액션 (Refine CanAccess 가드 적용) */}
                      <td className="px-5 py-4 text-right">
                        <CanAccess
                          resource="members"
                          action="assign_role"
                          fallback={
                            <span className="text-xs font-medium text-slate-400">
                              조회 전용 (수정 권한 없음)
                            </span>
                          }
                        >
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                              사업자 보호 (변경 불가)
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setFeatureTarget(member)}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-800 transition hover:bg-indigo-50"
                              >
                                <Shield className="h-3.5 w-3.5" />
                                {translate('ep.members.action.appPerm')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignTarget(member);
                                  setSelectedRoleId(member.organization_role_id ?? '');
                                  setAssignReason('');
                                }}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
                              >
                                {member.organization_role_id
                                  ? translate('ep.members.action.changeRole')
                                  : translate('ep.members.action.assignRole')}
                              </button>

                              {member.organization_role_id ? (
                                <button
                                  type="button"
                                  onClick={() => setRevokeTarget(member)}
                                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                                >
                                  <UserX className="h-3.5 w-3.5 text-rose-600" />
                                  {translate('ep.members.action.revoke')}
                                </button>
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

      {canViewRoleAudit ? (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
          data-testid="role-delegation-audit"
        >
          <h2 className="text-base font-bold text-slate-900">최근 직급 부여·회수 이력</h2>
          <p className="mt-1 text-xs text-slate-500">
            누구에게 어떤 직급이 부여·회수되었는지 최근 기록을 확인합니다.
          </p>
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
                const reason =
                  typeof after.reason === 'string' && after.reason.trim()
                    ? after.reason
                    : null;
                return (
                  <li key={log.id} className="py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {formatAuditAction(log.action)}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {targetMember?.name ||
                          targetMember?.email ||
                          (targetId ? `${String(targetId).slice(0, 8)}…` : '대상 미상')}
                      </span>
                      {roleName ? (
                        <span className="text-xs text-indigo-700">→ {roleName}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString('ko-KR')}
                      {reason ? ` · ${reason}` : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {/* 앱·직무 권한 (개별) */}
      <MemberFeaturePermissionModal
        member={featureTarget}
        selfUserId={activeUser?.id ?? null}
        onClose={() => setFeatureTarget(null)}
        onError={setError}
        onMemberUpdated={(updated) => {
          setFeatureTarget(updated);
          setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }}
      />

      <MemberAppAccessBulkModal
        open={bulkAppAccessOpen}
        members={members}
        onClose={() => setBulkAppAccessOpen(false)}
        onError={setError}
        onMembersUpdated={setMembers}
      />
    </WorkPageFrame>
  );
}

