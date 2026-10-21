import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useCreate, useDelete, useList } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { canManageResourceCatalog } from '@/domain/permissions';
import { StorageService } from '@/services/storage';
import { listBookableResources, upsertBookableResource } from '@/core/resources/resourceService';
import { showToast } from '@/shared/feedback/uiFeedback';
import { filterRowsByMemberDepartmentScope } from '@/core/organizations/departmentScope';
import { useWorkspaceMemberScope } from './useWorkspaceMemberScope';

type ResourceTypeRow = {
  id: string;
  organization_id: string;
  name: string;
  category: 'EQUIPMENT' | 'SPACE';
  kind_slug: string;
  requires_approval: boolean;
  spec_schema: unknown;
  department_id?: string | null;
};

type TabId = 'catalog' | 'instances';

function slugifyKind(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base.length >= 2 ? base : `resource_${Date.now()}`;
}

export const WorkspaceResourcesPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const memberScope = useWorkspaceMemberScope();
  const settings = (currentOrganization?.settings ?? null) as Record<string, unknown> | null;
  const defaultRequiresApproval = settings?.resource_types_require_approval_default === true;
  const orgId = currentOrganization?.id ?? null;
  const active = StorageService.getActiveUser();
  const canManage = canManageResourceCatalog({
    role: active?.role === 'owner' ? 'owner' : 'staff',
    customRole: { permissions: active?.customRole?.permissions ?? null },
  });

  const [tab, setTab] = useState<TabId>('catalog');
  const [instances, setInstances] = useState<Awaited<ReturnType<typeof listBookableResources>>>([]);
  const [loadingInstances, setLoadingInstances] = useState(false);

  const [typeName, setTypeName] = useState('');
  const [typeCategory, setTypeCategory] = useState<'EQUIPMENT' | 'SPACE'>('SPACE');
  const [requiresApproval, setRequiresApproval] = useState(defaultRequiresApproval);

  useEffect(() => {
    setRequiresApproval(defaultRequiresApproval);
  }, [defaultRequiresApproval]);
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState('');

  const { query: typesQuery } = useList<ResourceTypeRow>({
    resource: 'resource_types',
    meta: { schema: 'core' },
    sorters: [{ field: 'name', order: 'asc' }],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: Boolean(orgId) },
  });

  const typesRaw = (typesQuery?.data?.data as ResourceTypeRow[]) ?? [];
  const types = useMemo(() => {
    if (memberScope.isGlobalScope) return typesRaw;
    return filterRowsByMemberDepartmentScope(typesRaw, {
      scopeType: memberScope.scopeType,
      memberDepartmentId: memberScope.memberDepartmentId,
      memberPath: memberScope.memberPath,
      departmentPathById: memberScope.departmentPathById,
    });
  }, [typesRaw, memberScope]);
  const { mutate: createType } = useCreate();
  const { mutate: deleteType } = useDelete();

  const reloadInstances = useCallback(async () => {
    if (!orgId) return;
    setLoadingInstances(true);
    try {
      const rows = await listBookableResources({ organizationId: orgId, kind: selectedKind ?? undefined });
      setInstances(rows);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '자원 목록 조회 실패', 'error');
    } finally {
      setLoadingInstances(false);
    }
  }, [orgId, selectedKind]);

  useEffect(() => {
    void reloadInstances();
  }, [reloadInstances]);

  const filteredTypes = useMemo(() => types, [types]);

  const handleAddType = (event: React.FormEvent) => {
    event.preventDefault();
    if (!orgId || !canManage) return;
    const name = typeName.trim();
    if (!name) return;
    const kind_slug = slugifyKind(name);
    createType(
      {
        resource: 'resource_types',
        values: {
          organization_id: orgId,
          name,
          category: typeCategory,
          kind_slug,
          requires_approval: requiresApproval,
          spec_schema: [],
        },
        meta: { schema: 'core' },
      },
      {
        onSuccess: () => {
          setTypeName('');
          showToast('자원 종류가 등록되었습니다.', 'success');
          void typesQuery?.refetch?.();
        },
        onError: () => showToast('자원 종류 등록에 실패했습니다.', 'error'),
      },
    );
  };

  const handleAddInstance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orgId || !selectedKind || !instanceName.trim()) return;
    try {
      await upsertBookableResource({
        organizationId: orgId,
        kind: selectedKind,
        name: instanceName.trim(),
        capacity: 1,
      });
      setInstanceName('');
      showToast('자원 인스턴스가 저장되었습니다.', 'success');
      await reloadInstances();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '저장 실패', 'error');
    }
  };

  return (
    <main className="mx-auto max-w-3xl p-4 pb-12">
      <h1 className="text-lg font-semibold text-slate-900">공용자원 관리</h1>
      <p className="mt-1 text-sm text-slate-600">총무팀 자원 카탈로그와 예약 가능 인스턴스를 관리합니다.</p>

      <div className="mt-4 flex gap-2">
        {(['catalog', 'instances'] as TabId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`min-h-12 flex-1 rounded-xl border px-3 text-sm font-medium ${
              tab === id ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white'
            }`}
            onClick={() => setTab(id)}
          >
            {id === 'catalog' ? '자원 카탈로그' : '자원 인스턴스'}
          </button>
        ))}
      </div>

      {tab === 'catalog' ? (
        <section className="mt-6 space-y-4">
          {canManage ? (
            <form onSubmit={handleAddType} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <label className="block text-sm font-medium">자원 종류 추가</label>
              <input
                className="min-h-12 w-full rounded-xl border border-slate-200 px-3"
                placeholder="예: 법인차량, 회의실 A"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
              />
              <select
                className="min-h-12 w-full rounded-xl border border-slate-200 px-3"
                value={typeCategory}
                onChange={(e) => setTypeCategory(e.target.value as 'EQUIPMENT' | 'SPACE')}
              >
                <option value="SPACE">공간 (SPACE)</option>
                <option value="EQUIPMENT">장비 (EQUIPMENT)</option>
              </select>
              <label className="flex min-h-12 items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300"
                />
                예약·사용 시 결재 필요
              </label>
              <button type="submit" className="min-h-12 w-full rounded-xl bg-indigo-600 text-white font-medium">
                등록
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">자원 종류 변경은 총무(resources_manage) 권한이 필요합니다.</p>
          )}

          <ul className="divide-y rounded-2xl border border-slate-200 bg-white">
            {filteredTypes.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.category} · kind={row.kind_slug}</p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    className="min-h-12 rounded-xl border border-rose-200 px-4 text-sm text-rose-700"
                    onClick={() =>
                      deleteType(
                        { resource: 'resource_types', id: row.id, meta: { schema: 'core' } },
                        { onSuccess: () => void typesQuery?.refetch?.() },
                      )
                    }
                  >
                    삭제
                  </button>
                ) : null}
              </li>
            ))}
            {filteredTypes.length === 0 ? (
              <li className="p-4 text-sm text-slate-500">등록된 자원 종류가 없습니다.</li>
            ) : null}
          </ul>
        </section>
      ) : (
        <section className="mt-6 space-y-4">
          <select
            className="min-h-12 w-full rounded-xl border border-slate-200 px-3"
            value={selectedKind ?? ''}
            onChange={(e) => setSelectedKind(e.target.value || null)}
          >
            <option value="">자원 종류 선택</option>
            {filteredTypes.map((t) => (
              <option key={t.id} value={t.kind_slug}>
                {t.name}
              </option>
            ))}
          </select>

          {selectedKind && canManage ? (
            <form onSubmit={(e) => void handleAddInstance(e)} className="flex gap-2">
              <input
                className="min-h-12 flex-1 rounded-xl border border-slate-200 px-3"
                placeholder="인스턴스 이름 (예: 1호 법인차)"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
              />
              <button type="submit" className="min-h-12 rounded-xl bg-slate-900 px-4 text-white text-sm">
                추가
              </button>
            </form>
          ) : null}

          {loadingInstances ? <p className="text-sm text-slate-500">불러오는 중…</p> : null}
          <ul className="divide-y rounded-2xl border border-slate-200 bg-white">
            {instances.map((row) => (
              <li key={row.id} className="p-4">
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-slate-500">
                  {row.kind} · {row.is_active ? '사용 가능' : '비활성'}
                </p>
              </li>
            ))}
            {!loadingInstances && instances.length === 0 ? (
              <li className="p-4 text-sm text-slate-500">표시할 자원이 없습니다.</li>
            ) : null}
          </ul>
        </section>
      )}
    </main>
  );
};
