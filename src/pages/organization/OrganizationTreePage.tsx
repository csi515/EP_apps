import React from 'react';
import { ChevronsDownUp, ChevronsUpDown, MapPin, Network, Plus, UserRoundX } from 'lucide-react';
import { DepartmentTreeView } from './DepartmentTreeView';
import { OrganizationDiagramView } from './OrganizationDiagramView';
import { OrganizationCreateDepartmentModal } from './OrganizationCreateDepartmentModal';
import { OrgWorkspaceLayout } from './OrgWorkspaceLayout';
import { OrgDepartmentBoard } from './OrgDepartmentBoard';
import { OrgUnassignedDrawer } from './OrgUnassignedDrawer';
import { OrgDeleteDepartmentDialog } from './OrgDeleteDepartmentDialog';
import { OrgRosterTable } from './OrgRosterTable';
import { useOrganizationTreePageController } from './useOrganizationTreePageController';
import { ORG_CHART_COPY } from './orgChartCopy';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { Button } from '@/shared/components/ui/Button';
import { PageListSkeleton } from '@/shared/components/ui/Skeleton';

export const OrganizationTreePage: React.FC = () => {
  const c = useOrganizationTreePageController();

  if (!c.enabled) {
    return (
      <WorkPageFrame width="form" as="main">
        <p className="text-sm text-slate-600">{ORG_CHART_COPY.hiddenHint}</p>
      </WorkPageFrame>
    );
  }

  return (
    <WorkPageFrame width="hub" as="main">
      <PageHeader
        icon={<Network className="h-5 w-5" />}
        title={ORG_CHART_COPY.title}
        description={ORG_CHART_COPY.subtitle}
        actions={
          c.canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={c.editMode ? 'secondary' : 'outline'}
                onClick={() => c.setEditMode((v) => !v)}
              >
                {c.editMode ? ORG_CHART_COPY.viewMode : ORG_CHART_COPY.editMode}
              </Button>
              <Button
                type="button"
                onClick={() => c.openCreate(c.selectedDeptId)}
                data-testid="org-create-department-open"
              >
                <Plus className="h-4 w-4" />
                {ORG_CHART_COPY.create}
              </Button>
            </div>
          ) : null
        }
      />

      <div className="mt-4">
        <SegmentedControl
          aria-label={ORG_CHART_COPY.pageModeLabel}
          value={c.pageMode}
          onChange={(v) => c.setPageMode(v)}
          activeClassName="bg-slate-800 text-white shadow-none"
          options={[
            { value: 'workspace', label: ORG_CHART_COPY.viewWorkspace },
            { value: 'roster', label: ORG_CHART_COPY.viewRoster },
          ]}
        />
      </div>

      {c.pageMode === 'roster' ? (
        c.orgId ? (
          <OrgRosterTable
            organizationId={c.orgId}
            members={c.members}
            nodes={c.sortedNodes}
            departmentMembers={c.departmentMembers}
            roles={c.roles}
            canEdit={c.canManage}
            moveMember={c.moveMember}
            bulkMoveMembers={c.bulkMoveMembers}
            unassignFromDepartment={c.unassignFromDepartment}
            reload={c.reload}
          />
        ) : null
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SegmentedControl
              aria-label={ORG_CHART_COPY.viewModeLabel}
              value={c.centerView}
              onChange={(v) => c.setCenterView(v)}
              activeClassName="bg-slate-800 text-white shadow-none"
              options={[
                { value: 'board', label: ORG_CHART_COPY.viewBoard },
                { value: 'diagram', label: ORG_CHART_COPY.viewDiagram },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => c.setUnassignedOpen(true)}
                data-testid="org-open-unassigned"
              >
                <UserRoundX className="h-3.5 w-3.5" />
                {ORG_CHART_COPY.unassignedCount(c.unassignedMembers.length)}
              </Button>
              <Button type="button" variant="outline" onClick={c.expandAll}>
                <ChevronsUpDown className="h-3.5 w-3.5" />
                {ORG_CHART_COPY.expandAll}
              </Button>
              <Button type="button" variant="outline" onClick={c.collapseAll}>
                <ChevronsDownUp className="h-3.5 w-3.5" />
                {ORG_CHART_COPY.collapseAll}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={c.goMyDepartment}
                data-testid="org-go-my-department"
              >
                <MapPin className="h-3.5 w-3.5" />
                {ORG_CHART_COPY.goMyDepartment}
              </Button>
            </div>
          </div>

          {c.centerView === 'diagram' && c.editMode ? (
            <p className="mt-2 text-xs font-medium text-slate-600">
              {ORG_CHART_COPY.diagramEditHint}
            </p>
          ) : null}

          {c.undo ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <span className="font-medium text-slate-700">{ORG_CHART_COPY.memberMoved}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => void c.handleUndo()}>
                {ORG_CHART_COPY.memberMovedUndo}
              </Button>
            </div>
          ) : null}

          {c.missingLeaders.length > 0 ? (
            <div
              className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5"
              data-testid="org-missing-leaders"
            >
              <p className="text-xs font-bold text-amber-950">
                {ORG_CHART_COPY.missingLeadersTitle}
                <span className="ml-2 font-semibold text-amber-800">
                  {ORG_CHART_COPY.missingLeadersHint(c.missingLeaders.length)}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.missingLeaders.slice(0, 12).map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className="min-h-9 rounded-lg border border-amber-200 bg-white px-2.5 text-[11px] font-bold text-amber-900"
                    onClick={() => c.focusDepartment(node.id)}
                  >
                    {node.unitKind ? `${node.unitKind} · ` : ''}
                    {node.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {c.loading ? (
            <div className="mt-3">
              <PageListSkeleton rows={4} />
              <span className="sr-only">{ORG_CHART_COPY.loading}</span>
            </div>
          ) : null}
          {c.error || c.localError ? (
            <p className="mt-3 text-sm font-semibold text-rose-600">{c.error || c.localError}</p>
          ) : null}

          <OrgWorkspaceLayout
            tree={
              <DepartmentTreeView
                nodes={c.sortedNodes}
                selectedId={c.selectedDeptId}
                onSelect={c.setSelectedDeptId}
                canManage={c.canManage}
                editMode={c.editMode}
                collapsedIds={c.collapsedIds}
                onToggleCollapse={c.handleToggleCollapse}
                scrollToDepartmentId={c.scrollToDepartmentId}
                departmentMembers={c.departmentMembers}
                members={c.members}
                roles={c.roles}
                onMove={c.handleMoveDepartment}
                onMemberDrop={(memberId, departmentId) => {
                  void c.applyMoveWithUndo([memberId], departmentId);
                }}
                onAddChild={(parentId) => c.openCreate(parentId)}
                onRename={c.handleRenameDepartment}
              />
            }
            main={
              c.centerView === 'board' ? (
                <OrgDepartmentBoard
                  node={c.selectedNode}
                  nodes={c.sortedNodes}
                  members={c.members}
                  departmentMembers={c.departmentMembers}
                  roles={c.roles}
                  canEdit={c.canManage}
                  selectedMemberIds={c.selectedMemberIds}
                  onToggleSelect={c.toggleMemberSelect}
                  onClearSelection={c.clearMemberSelection}
                  onSelectDepartment={c.focusDepartment}
                  onBulkMove={(departmentId) =>
                    c.applyMoveWithUndo(Array.from(c.selectedMemberIds), departmentId)
                  }
                  onScopeChange={c.handleScopeChange}
                  onRequestDelete={
                    c.canManage && c.selectedNode ? () => c.setDeleteOpen(true) : undefined
                  }
                />
              ) : (
                <OrganizationDiagramView
                  nodes={c.sortedNodes}
                  selectedId={c.selectedDeptId}
                  onSelect={c.setSelectedDeptId}
                  collapsedIds={c.collapsedIds}
                  onToggleCollapse={c.handleToggleCollapse}
                  scrollToDepartmentId={c.scrollToDepartmentId}
                  departmentMembers={c.departmentMembers}
                  members={c.members}
                  roles={c.roles}
                />
              )
            }
            drawer={
              <OrgUnassignedDrawer
                open={c.unassignedOpen}
                members={c.unassignedMembers}
                canEdit={c.canManage}
                selectedMemberIds={c.selectedMemberIds}
                onClose={() => c.setUnassignedOpen(false)}
                onToggleSelect={c.toggleMemberSelect}
              />
            }
          />

          {c.canManage ? (
            <OrganizationCreateDepartmentModal
              open={c.createOpen}
              nodes={c.sortedNodes}
              defaultParentId={c.createParentId}
              onClose={() => c.setCreateOpen(false)}
              onCreate={c.handleCreateDepartment}
            />
          ) : null}

          <OrgDeleteDepartmentDialog
            open={c.deleteOpen}
            node={c.selectedNode}
            nodes={c.sortedNodes}
            memberCount={c.selectedDeptMemberCount}
            childCount={c.selectedDeptChildCount}
            onClose={() => c.setDeleteOpen(false)}
            onConfirm={c.handleConfirmDelete}
          />
        </>
      )}
    </WorkPageFrame>
  );
};
