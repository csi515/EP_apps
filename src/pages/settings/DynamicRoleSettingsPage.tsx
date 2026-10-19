import React, { useEffect, useState, type ReactNode } from 'react';
import { StorageService } from '@/services/storage';
import {
  assignOrganizationRole,
  deleteDynamicRole,
  listDynamicRoles,
  listRoleMembers,
  saveDynamicRole,
  type DynamicMemberRow,
  type DynamicRoleRow,
} from '@/core/organizations/services/dynamicRoleService';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import {
  canManageRoles,
  EMPTY_ROLE_PERMISSIONS,
  normalizeRolePermissions,
  type RolePermissionMap,
} from '@/domain/permissions';
import { RolePermissionMatrix } from './RolePermissionMatrix';
import { OwnershipTransferCard } from './OwnershipTransferCard';

type RoleRow = DynamicRoleRow;
type MemberRow = DynamicMemberRow;

export function AccessDeniedBanner() {
  return (
    <div role="alert" data-testid="forbidden-banner" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      403 Forbidden. 이 직급에는 해당 화면 권한이 없습니다.
    </div>
  );
}

export function FinanceRouteGate({ children }: { children: ReactNode }) {
  const { role } = useAuthorization();
  let flags = null;
  try {
    const stored = StorageService.getActiveUser()?.customRole?.permissions;
    flags = normalizeRolePermissions(stored);
  } catch {
    flags = null;
  }
  if (role !== 'owner' && flags && flags.billing_invoices !== true) {
    return <AccessDeniedBanner />;
  }
  return <>{children}</>;
}

export function DynamicRoleSettingsPage() {
  const { currentOrganization } = useOrganization();
  const { role } = useAuthorization();
  const orgId = currentOrganization?.id ?? '';
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<RolePermissionMap>(EMPTY_ROLE_PERMISSIONS);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const isOwner = role === 'owner';
  const activeUser = StorageService.getActiveUser();
  const canManage = isOwner || canManageRoles(activeUser);

  async function reload() {
    if (!orgId) return;
    try {
      setRoles(await listDynamicRoles(orgId));
      setMembers(await listRoleMembers(orgId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '조회에 실패했습니다.');
    }
  }

  useEffect(() => {
    void reload();
  }, [orgId]);

  async function saveRole() {
    if (!orgId || !name.trim()) return;
    try {
      await saveDynamicRole({ organizationId: orgId, id: editingId, name: name.trim(), permissions });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '저장에 실패했습니다.');
      return;
    }
    setOpen(false);
    setEditingId(null);
    setName('');
    setPermissions(EMPTY_ROLE_PERMISSIONS);
    await reload();
  }

  async function removeRole(role: RoleRow) {
    if (role.is_system) return;
    try {
      await deleteDynamicRole(role.id);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '삭제에 실패했습니다.');
    }
  }

  async function assign(memberId: string, roleId: string) {
    try {
      await assignOrganizationRole(memberId, roleId || null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '배정에 실패했습니다.');
    }
  }

  if (!canManage) return <AccessDeniedBanner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">직급 및 권한 관리</h1>
          <p className="text-sm text-slate-500">사업주가 직급과 업무 권한을 직접 편집합니다.</p>
        </div>
        <button type="button" className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white" onClick={() => setOpen(true)}>
          + 새 직급 만들기
        </button>
      </header>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <ul className="space-y-3">
        {roles.map((role) => {
          const count = members.filter((member) => member.organization_role_id === role.id).length;
          return (
            <li key={role.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{role.name}</p>
                  <p className="text-xs text-slate-500">배정 {count}명</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="min-h-11 px-3 text-sm" onClick={() => { setEditingId(role.id); setName(role.name); setPermissions(role.permissions); setOpen(true); }}>수정</button>
                  <button type="button" className="min-h-11 px-3 text-sm text-rose-600" disabled={role.is_system} onClick={() => void removeRole(role)}>삭제</button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(role.permissions).filter(([, on]) => on).map(([key]) => (
                  <span key={key} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">{key}</span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <section>
        <h2 className="mb-2 text-base font-bold">직원 직급 지정</h2>
        <ul className="space-y-2">
          {members.map((member) => (
            <li key={member.id} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-100 px-3">
              <span className="text-sm">{member.role === 'owner' ? '사업주' : member.user_id}</span>
              <select
                className="min-h-11 rounded-lg border px-2 text-sm"
                aria-label="직급 지정"
                value={member.organization_role_id ?? ''}
                disabled={member.role === 'owner'}
                onChange={(event) => void assign(member.id, event.target.value)}
              >
                <option value="">직급 없음</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </section>

      {/* CEO 대표 사업자 소유권 이전 관리 카드 */}
      <section className="pt-4">
        <OwnershipTransferCard />
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl">
            <h2 className="text-lg font-bold">{editingId ? '직급 수정' : '새 직급'}</h2>
            <label className="mt-3 block text-sm">
              직급명
              <input className="mt-1 min-h-11 w-full rounded-lg border px-3" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <div className="mt-4">
              <RolePermissionMatrix value={permissions} onChange={setPermissions} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="min-h-11 px-4" onClick={() => setOpen(false)}>닫기</button>
              <button type="button" className="min-h-11 rounded-xl bg-slate-900 px-4 text-white" onClick={() => void saveRole()}>저장</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
