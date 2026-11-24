import React, { useEffect, useMemo, useState } from 'react';
import { Download, Pencil } from 'lucide-react';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { assignOrganizationRole } from '@/core/organizations/services/dynamicRoleService';
import { setMemberActive } from '@/core/organizations/services/orgMemberAdminService';
import { Button } from '@/shared/components/ui/Button';
import { Pagination } from '@/shared/components/ui/Pagination';
import { useClientPagination } from '@/shared/hooks/useClientPagination';
import { showToast } from '@/shared/feedback/uiFeedback';
import type { DepartmentMemberRow, OrgNode } from './useOrganizationTree';
import {
  buildOrgRosterRows,
  filterOrgRosterRows,
  sortOrgRosterRows,
  type OrgRosterEmploymentFilter,
  type OrgRosterRow,
  type OrgRosterSortKey,
} from './orgRosterEngine';
import { exportOrgRosterXlsx } from './exportOrgRosterXlsx';
import { OrgRosterFilters } from './OrgRosterFilters';
import { OrgRosterBulkBar } from './OrgRosterBulkBar';
import { OrgRosterEditDrawer } from './OrgRosterEditDrawer';
import { ORG_CHART_COPY } from './orgChartCopy';

type Props = {
  organizationId: string;
  members: readonly DynamicMemberRow[];
  nodes: readonly OrgNode[];
  departmentMembers: readonly DepartmentMemberRow[];
  roles: readonly DynamicRoleRow[];
  canEdit: boolean;
  moveMember: (memberId: string, departmentId: string) => Promise<void>;
  unassignFromDepartment: (memberId: string, departmentId: string) => Promise<void>;
  reload: () => Promise<void>;
};

export function OrgRosterTable({
  organizationId,
  members,
  nodes,
  departmentMembers,
  roles,
  canEdit,
  moveMember,
  unassignFromDepartment,
  reload,
}: Props) {
  const [query, setQuery] = useState('');
  const [employment, setEmployment] = useState<OrgRosterEmploymentFilter>('all');
  const [sortKey, setSortKey] = useState<OrgRosterSortKey>('name');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editRow, setEditRow] = useState<OrgRosterRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [memberOverrides, setMemberOverrides] = useState<Record<string, DynamicMemberRow>>({});

  useEffect(() => {
    setMemberOverrides({});
  }, [members]);

  const resolvedMembers = useMemo(
    () => members.map((m) => memberOverrides[m.id] ?? m),
    [members, memberOverrides],
  );

  const allRows = useMemo(
    () =>
      buildOrgRosterRows({
        members: resolvedMembers,
        nodes,
        departmentMembers,
        roles,
      }),
    [resolvedMembers, nodes, departmentMembers, roles],
  );

  const filteredRows = useMemo(
    () =>
      sortOrgRosterRows(
        filterOrgRosterRows(allRows, { query, employment }),
        sortKey,
        'asc',
      ),
    [allRows, query, employment, sortKey],
  );

  const { page, pageSize, total, pagedItems, setPage, setPageSize } = useClientPagination(
    filteredRows,
    50,
  );

  useEffect(() => {
    setPage(1);
  }, [query, employment, sortKey, setPage]);

  const editMember = useMemo(() => {
    if (!editRow) return null;
    return resolvedMembers.find((m) => m.id === editRow.memberId) ?? null;
  }, [editRow, resolvedMembers]);

  const toggleSelect = (memberId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const pageIds = pagedItems.map((r) => r.memberId);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const handleExportAll = async () => {
    if (allRows.length === 0) {
      showToast(ORG_CHART_COPY.rosterEmpty, 'info');
      return;
    }
    setExporting(true);
    try {
      await exportOrgRosterXlsx({ organizationId, rows: allRows });
      showToast(ORG_CHART_COPY.rosterExportDone, 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '내보내기 실패', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleBulkMove = async (departmentId: string) => {
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        await moveMember(id, departmentId);
      }
      setSelectedIds(new Set());
      showToast(ORG_CHART_COPY.rosterMoveDone(ids.length), 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '일괄 이동 실패', 'error');
    }
  };

  const handleSaveRow = async (input: {
    memberId: string;
    departmentId: string | null;
    roleId: string | null;
    isActive: boolean;
  }) => {
    const current = allRows.find((r) => r.memberId === input.memberId);
    if (!current) return;
    try {
      if (input.departmentId && input.departmentId !== current.departmentId) {
        await moveMember(input.memberId, input.departmentId);
      } else if (!input.departmentId && current.departmentId) {
        await unassignFromDepartment(input.memberId, current.departmentId);
      }

      if ((input.roleId ?? null) !== (current.roleId ?? null)) {
        await assignOrganizationRole(input.memberId, input.roleId);
      }

      if (input.isActive !== current.isActive) {
        await setMemberActive(organizationId, input.memberId, input.isActive);
      }

      await reload();
      setEditRow(null);
      showToast(ORG_CHART_COPY.rosterSaved, 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '저장 실패', 'error');
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3" data-testid="org-roster-table">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">{ORG_CHART_COPY.rosterTitle}</h2>
          <p className="text-xs text-slate-500">{ORG_CHART_COPY.rosterSubtitle}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={exporting}
          isLoading={exporting}
          onClick={() => void handleExportAll()}
        >
          <Download className="h-4 w-4" />
          {ORG_CHART_COPY.rosterExport}
        </Button>
      </div>

      <OrgRosterFilters
        query={query}
        onQueryChange={setQuery}
        employment={employment}
        onEmploymentChange={setEmployment}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
      />

      <OrgRosterBulkBar
        selectedCount={selectedIds.size}
        nodes={nodes}
        onClear={() => setSelectedIds(new Set())}
        onMove={handleBulkMove}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allPageSelected}
                  onChange={() => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (allPageSelected) {
                        for (const id of pageIds) next.delete(id);
                      } else {
                        for (const id of pageIds) next.add(id);
                      }
                      return next;
                    });
                  }}
                  aria-label={ORG_CHART_COPY.rosterSelectAll}
                  disabled={!canEdit && selectedIds.size === 0}
                />
              </th>
              <th className="px-2 py-2">{ORG_CHART_COPY.rosterColLoginId}</th>
              <th className="px-2 py-2">{ORG_CHART_COPY.rosterColName}</th>
              <th className="px-2 py-2">{ORG_CHART_COPY.rosterColRole}</th>
              <th className="px-2 py-2">{ORG_CHART_COPY.rosterColDepartment}</th>
              <th className="px-2 py-2">{ORG_CHART_COPY.rosterColEmployment}</th>
              <th className="px-2 py-2">{ORG_CHART_COPY.rosterColActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  {ORG_CHART_COPY.rosterEmpty}
                </td>
              </tr>
            ) : (
              pagedItems.map((row) => (
                <tr key={row.memberId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedIds.has(row.memberId)}
                      onChange={() => toggleSelect(row.memberId)}
                      aria-label={row.name}
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-medium text-slate-700">
                    {row.loginId || '—'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-semibold text-slate-900">
                    {row.name}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                    {row.roleName || '—'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                    {row.departmentName || '—'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2">
                    <span
                      className={
                        row.isActive
                          ? 'text-xs font-bold text-emerald-700'
                          : 'text-xs font-bold text-slate-500'
                      }
                    >
                      {row.isActive
                        ? ORG_CHART_COPY.rosterActive
                        : ORG_CHART_COPY.rosterInactive}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={ORG_CHART_COPY.rosterEdit}
                      onClick={() => setEditRow(row)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        current={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[20, 50, 100]}
      />

      <OrgRosterEditDrawer
        open={Boolean(editRow)}
        row={editRow}
        member={editMember}
        nodes={nodes}
        roles={roles}
        canEdit={canEdit}
        onClose={() => setEditRow(null)}
        onMemberPermissionsUpdated={(updated) => {
          setMemberOverrides((prev) => ({ ...prev, [updated.id]: updated }));
        }}
        onSave={handleSaveRow}
      />
    </div>
  );
}
