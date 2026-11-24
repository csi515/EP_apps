import React, { useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { ContentFadeIn } from '@/shared/components/ui/ContentFadeIn';
import { MboCycleStatusBar } from './MboCycleStatusBar';
import { MboManagerKpiStrip } from './MboManagerKpiStrip';
import { MboAlignmentContextStrip } from './MboAlignmentContextStrip';
import { MboAlignmentSlotModal } from './MboAlignmentSlotModal';
import { MboHierarchyGanttView } from './MboHierarchyGanttView';
import { MboProjectsTable } from './MboProjectsTable';
import { MboPlanActualMatrixView } from './MboPlanActualMatrixView';
import { MboUsageSteps } from './MboUsageSteps';
import { MboProjectsPanelChrome } from './MboProjectsPanelChrome';
import { MboHubSummaryCards } from './MboHubSummaryCards';
import { MBO_COPY } from './mboUiCopy';
import type { AlignmentSlot } from '../domain/mboOrgAlignedTreeEngine';
import {
  filterProjectsByCompletion,
  filterProjectsByOwners,
} from '../domain/projectPortfolioEngine';
import type { MboManagementWorkspace } from '../hooks/useMboManagementWorkspace';

type Props = {
  ws: MboManagementWorkspace;
};

export const MboManagementMainContent: React.FC<Props> = ({ ws }) => {
  const {
    goalsLocked,
    canManagerCreateWhileLocked,
    openCreateObjectiveModal,
    orgId,
    isOrgAdmin,
    setCycleSettings,
    isManager,
    setDetailObjectiveId,
    personQuery,
    setPersonQuery,
    selectedMemberUserIds,
    managerKpis,
    hubSummary,
    teamMemberChips,
    setSelectedMemberUserIds,
    setGanttCheckinOnly,
    ganttCheckinOnly,
    setSelectedObjectiveId,
    ganttSectionRef,
    hierarchyGanttRows,
    portfolioProjects,
    projectCategories,
    selectedProjectId,
    linkProjectToObjective,
    reloadProjectCategories,
    setContentPanel,
    scheduleViewMode,
    setScheduleViewMode,
    matrixYear,
    setMatrixYear,
    setListScope,
    alignmentContext,
    openProjectFromGantt,
    handleDeleteProject,
    viewerUserId,
    objectives,
    projectCompletionFilter,
    setProjectCompletionFilter,
    missingMonthlyProjectIds,
  } = ws;

  const [alignmentModalSlot, setAlignmentModalSlot] = useState<AlignmentSlot | null>(null);

  const pageTitle = isManager ? MBO_COPY.appTitleManager : MBO_COPY.appTitle;
  const createDisabled = goalsLocked && !canManagerCreateWhileLocked;
  const hasAnyGoal = objectives.length > 0;
  const showUsageSteps = !hasAnyGoal;
  const editableProjectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of portfolioProjects) {
      if (p.ownerId && viewerUserId && p.ownerId === viewerUserId) ids.add(p.id);
    }
    return ids;
  }, [portfolioProjects, viewerUserId]);
  const showAlignmentStrip = Boolean(
    alignmentContext.company || alignmentContext.department || alignmentContext.mine,
  );
  const segmentActive = 'bg-slate-800 text-white shadow-none';

  const filteredPortfolioProjects = useMemo(() => {
    let list = portfolioProjects;
    if (isManager && selectedMemberUserIds.length > 0) {
      list = filterProjectsByOwners(list, selectedMemberUserIds);
    }
    list = filterProjectsByCompletion(list, projectCompletionFilter);
    if (ganttCheckinOnly) {
      const missing = new Set(missingMonthlyProjectIds);
      list = list.filter((p) => missing.has(p.id));
    }
    return list;
  }, [
    portfolioProjects,
    isManager,
    selectedMemberUserIds,
    projectCompletionFilter,
    ganttCheckinOnly,
    missingMonthlyProjectIds,
  ]);

  const filteredGanttRows = useMemo(() => {
    const keep = new Set(filteredPortfolioProjects.map((p) => p.id));
    // 간트는 실행 과제만 — 완료/담당 필터와 테이블 keep 집합을 동일하게 적용
    return hierarchyGanttRows.filter((r) => r.kind === 'project' && keep.has(r.id));
  }, [hierarchyGanttRows, filteredPortfolioProjects]);

  const clearFilters = () => {
    setGanttCheckinOnly(false);
    setProjectCompletionFilter('active');
    setSelectedMemberUserIds([]);
    setPersonQuery('');
  };

  const seeUpstream = () => {
    setListScope('visible');
    setContentPanel('schedule');
  };

  return (
    <div className="space-y-3">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{pageTitle}</h1>
          {createDisabled ? (
            <p className="mt-1 text-[11px] font-medium text-amber-800">{MBO_COPY.lockBlockCreate}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="primary"
            size="lg"
            disabled={createDisabled}
            data-testid="mbo-create-objective-open"
            onClick={openCreateObjectiveModal}
          >
            {MBO_COPY.createGoal}
          </Button>
        </div>
      </header>

      {showUsageSteps ? (
        <MboUsageSteps
          contentPanel="schedule"
          hasGoals={hasAnyGoal}
          createDisabled={createDisabled}
          onCreateGoal={openCreateObjectiveModal}
          onSelectSchedule={() => setContentPanel('schedule')}
        />
      ) : null}

      <MboCycleStatusBar
        organizationId={orgId}
        canEditCycle={isOrgAdmin}
        onSettingsChange={setCycleSettings}
        isManager={isManager}
      />

      {showAlignmentStrip ? (
        <MboAlignmentContextStrip
          context={alignmentContext}
          onSelectSlot={setAlignmentModalSlot}
          onEmptyScopeAction={!isManager ? seeUpstream : undefined}
        />
      ) : null}

      <div className="space-y-2.5 border-t border-slate-200 pt-3">
        {isManager ? (
          <MboManagerKpiStrip kpis={managerKpis} managerMode />
        ) : (
          <MboHubSummaryCards hubSummary={hubSummary} />
        )}

        {ganttCheckinOnly ? (
          <p className="text-xs font-medium text-slate-700">
            {MBO_COPY.filterMissingReport}
            <Button variant="ghost" size="sm" className="ml-2" onClick={clearFilters}>
              {MBO_COPY.filterClear}
            </Button>
          </p>
        ) : null}
      </div>

      <section ref={ganttSectionRef} className="min-h-[200px]" data-testid="mbo-main-panel">
        <ContentFadeIn motionKey={`schedule-${scheduleViewMode}-${projectCompletionFilter}`}>
          <div className="space-y-2">
            <MboProjectsPanelChrome
              isManager={isManager}
              scheduleViewMode={scheduleViewMode}
              onScheduleViewModeChange={setScheduleViewMode}
              completionFilter={projectCompletionFilter}
              onCompletionFilterChange={setProjectCompletionFilter}
              segmentActive={segmentActive}
              personQuery={personQuery}
              onPersonQueryChange={setPersonQuery}
              teamMemberChips={teamMemberChips}
              selectedMemberUserIds={selectedMemberUserIds}
              onChangeSelectedMembers={(ids) => {
                setSelectedMemberUserIds(ids);
                setGanttCheckinOnly(false);
              }}
            />
            {scheduleViewMode === 'table' ? (
              <MboProjectsTable
                projects={filteredPortfolioProjects}
                viewerUserId={viewerUserId ?? ''}
                onOpen={openProjectFromGantt}
                onDelete={handleDeleteProject}
                onCreateGoal={createDisabled ? undefined : openCreateObjectiveModal}
                filterKey={`${projectCompletionFilter}-${selectedMemberUserIds.join(',')}-${ganttCheckinOnly ? '1' : '0'}-${personQuery}`}
              />
            ) : scheduleViewMode === 'matrix' ? (
              orgId ? (
                <MboPlanActualMatrixView
                  organizationId={orgId}
                  year={matrixYear}
                  onYearChange={setMatrixYear}
                  projects={filteredPortfolioProjects}
                  categories={projectCategories}
                  viewerUserId={viewerUserId ?? ''}
                  editableProjectIds={editableProjectIds}
                  selectedOwnerIds={selectedMemberUserIds}
                />
              ) : null
            ) : (
              <MboHierarchyGanttView
                rows={filteredGanttRows}
                projects={filteredPortfolioProjects}
                categories={projectCategories}
                organizationId={orgId}
                selectedProjectId={selectedProjectId}
                scheduleEditable={false}
                editableProjectIds={editableProjectIds}
                onSelectProject={linkProjectToObjective}
                onOpenProjectSheet={openProjectFromGantt}
                onCategoriesChanged={() => void reloadProjectCategories()}
                onOpenCreateObjective={openCreateObjectiveModal}
                onOpenObjectiveDetail={(id) => setDetailObjectiveId(id)}
                onClearFilters={ganttCheckinOnly ? clearFilters : undefined}
              />
            )}
          </div>
        </ContentFadeIn>
      </section>

      <MboAlignmentSlotModal
        slot={alignmentModalSlot}
        context={alignmentContext}
        onClose={() => setAlignmentModalSlot(null)}
        onOpenDetail={(id) => {
          setSelectedObjectiveId(id);
          setDetailObjectiveId(id);
        }}
      />
    </div>
  );
};
