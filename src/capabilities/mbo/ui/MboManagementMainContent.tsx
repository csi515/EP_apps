import React, { useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { ContentFadeIn } from '@/shared/components/ui/ContentFadeIn';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { MboCycleStatusBar } from './MboCycleStatusBar';
import { MboManagerKpiStrip } from './MboManagerKpiStrip';
import { MboAlignmentContextStrip } from './MboAlignmentContextStrip';
import { MboAlignmentSlotModal } from './MboAlignmentSlotModal';
import { MboHierarchyGanttView } from './MboHierarchyGanttView';
import { MboProjectsTable } from './MboProjectsTable';
import { MboUsageSteps } from './MboUsageSteps';
import { MboHubPrimaryNav } from './MboHubPrimaryNav';
import { MboGoalsPanelChrome } from './MboGoalsPanelChrome';
import { MboGoalsBoardSection } from './MboGoalsBoardSection';
import { MboHubSummaryCards } from './MboHubSummaryCards';
import { MBO_COPY } from './mboUiCopy';
import type { AlignmentSlot } from '../domain/mboOrgAlignedTreeEngine';
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
    pendingChangeApprovals,
    setPendingApprovalsOpen,
    setDetailObjectiveId,
    weightValidation,
    dashboardView,
    setDashboardView,
    personQuery,
    setPersonQuery,
    selectedMemberUserIds,
    managerKpis,
    hubSummary,
    teamMemberChips,
    setSelectedMemberUserIds,
    setGanttCheckinOnly,
    ganttCheckinOnly,
    teamBoardBuckets,
    selectedObjectiveId,
    setSelectedObjectiveId,
    ganttSectionRef,
    hierarchyGanttRows,
    portfolioProjects,
    projectCategories,
    selectedProjectId,
    linkProjectToObjective,
    reloadProjectCategories,
    contentPanel,
    setContentPanel,
    scheduleViewMode,
    setScheduleViewMode,
    goalViewMode,
    setGoalViewMode,
    setListScope,
    listScope,
    alignmentContext,
    orgAlignedRows,
    hasUpstreamPublicGoals,
    openObjectiveOnSchedule,
    openProjectFromGantt,
    handleDeleteProject,
    viewerUserId,
    objectives,
  } = ws;

  const [alignmentModalSlot, setAlignmentModalSlot] = useState<AlignmentSlot | null>(null);

  const managerTeamMode = isManager && dashboardView !== 'mine';
  const pageTitle = managerTeamMode ? MBO_COPY.appTitleManager : MBO_COPY.appTitle;
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

  const clearFilters = () => {
    setGanttCheckinOnly(false);
  };

  const seeUpstream = () => {
    setListScope('visible');
    setGoalViewMode('org');
    setContentPanel('goals');
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
          contentPanel={contentPanel}
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
        pendingChangeApprovals={pendingChangeApprovals}
        onOpenPendingApprovals={() => setPendingApprovalsOpen(true)}
      />

      {showAlignmentStrip ? (
        <MboAlignmentContextStrip
          context={alignmentContext}
          onSelectSlot={setAlignmentModalSlot}
          onEmptyScopeAction={!isManager ? seeUpstream : undefined}
        />
      ) : null}

      <div className="space-y-2.5 border-t border-slate-200 pt-3">
        <MboHubPrimaryNav
          isManager={isManager}
          dashboardView={dashboardView}
          onDashboardViewChange={setDashboardView}
          listScope={listScope}
          onListScopeChange={setListScope}
          contentPanel={contentPanel}
          onContentPanelChange={setContentPanel}
          segmentActive={segmentActive}
        />

        {managerTeamMode ? (
          <MboManagerKpiStrip kpis={managerKpis} managerMode />
        ) : (
          <MboHubSummaryCards hubSummary={hubSummary} />
        )}

        {ganttCheckinOnly && contentPanel === 'schedule' ? (
          <p className="text-xs font-medium text-slate-700">
            {MBO_COPY.filterMissingReport}
            <Button variant="ghost" size="sm" className="ml-2" onClick={clearFilters}>
              {MBO_COPY.filterClear}
            </Button>
          </p>
        ) : null}
      </div>

      <section ref={ganttSectionRef} className="min-h-[200px]" data-testid="mbo-main-panel">
        <ContentFadeIn motionKey={`${contentPanel}-${goalViewMode}-${scheduleViewMode}`}>
          {contentPanel === 'schedule' ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="flex flex-col gap-1" data-testid="mbo-schedule-view-mode">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {MBO_COPY.viewModeLabel}
                  </span>
                  <SegmentedControl
                    value={scheduleViewMode}
                    onChange={setScheduleViewMode}
                    activeClassName={segmentActive}
                    options={[
                      { value: 'table', label: MBO_COPY.scheduleViewTable },
                      { value: 'gantt', label: MBO_COPY.scheduleViewGantt },
                    ]}
                  />
                </div>
              </div>
              {scheduleViewMode === 'table' ? (
                <MboProjectsTable
                  projects={portfolioProjects}
                  viewerUserId={viewerUserId ?? ''}
                  onOpen={openProjectFromGantt}
                  onDelete={handleDeleteProject}
                  onCreateGoal={createDisabled ? undefined : openCreateObjectiveModal}
                />
              ) : (
                <MboHierarchyGanttView
                  rows={hierarchyGanttRows}
                  projects={portfolioProjects}
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
          ) : (
            <div className="space-y-2">
              <MboGoalsPanelChrome
                managerTeamMode={managerTeamMode}
                goalViewMode={goalViewMode}
                onGoalViewModeChange={setGoalViewMode}
                segmentActive={segmentActive}
                personQuery={personQuery}
                onPersonQueryChange={setPersonQuery}
                teamMemberChips={teamMemberChips}
                selectedMemberUserIds={selectedMemberUserIds}
                onChangeSelectedMembers={(ids) => {
                  setSelectedMemberUserIds(ids);
                  clearFilters();
                }}
                showWeightHint={managerTeamMode && !weightValidation.valid}
                weightHint={MBO_COPY.weightInvalid(
                  weightValidation.totalWeight,
                  weightValidation.difference,
                )}
              />
              <MboGoalsBoardSection
                goalViewMode={goalViewMode}
                orgAlignedRows={orgAlignedRows}
                teamBoardBuckets={teamBoardBuckets}
                selectedObjectiveId={selectedObjectiveId}
                personQuery={personQuery}
                selectedMemberUserIds={selectedMemberUserIds}
                listScope={listScope}
                hasUpstreamPublicGoals={hasUpstreamPublicGoals}
                isManager={isManager}
                onSelectObjective={(id) => {
                  setSelectedObjectiveId(id);
                  setDetailObjectiveId(id);
                }}
                onOpenDetail={(id) => setDetailObjectiveId(id)}
                onShowOnSchedule={(id) => openObjectiveOnSchedule(id)}
                onSeeUpstream={seeUpstream}
                onCreateGoal={openCreateObjectiveModal}
              />
            </div>
          )}
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
