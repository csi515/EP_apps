import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { SearchField } from '@/shared/components/ui/SearchField';
import { ContentFadeIn } from '@/shared/components/ui/ContentFadeIn';
import { uiMotion } from '@/shared/components/ui/uiMotion';
import { MboCycleStatusBar } from './MboCycleStatusBar';
import { MboManagerKpiStrip } from './MboManagerKpiStrip';
import { MboTeamMemberChips } from './MboTeamMemberChips';
import { MboTeamObjectiveBoard } from './MboTeamObjectiveBoard';
import { MboHierarchyGanttView } from './MboHierarchyGanttView';
import { memberMatchesQuery } from '../domain/mboVisibilityEngine';
import { MBO_COPY } from './mboUiCopy';
import type { MboManagementWorkspace } from '../hooks/useMboManagementWorkspace';
import type { MboContentPanel } from '../hooks/useMboManagementWorkspaceState';

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
    personQuery,
    selectedMemberUserIds,
    managerKpis,
    handleManagerRiskFilter,
    handleManagerCheckinFilter,
    hubSummary,
    teamMemberChips,
    setSelectedMemberUserIds,
    setGanttRiskOnly,
    setGanttCheckinOnly,
    ganttRiskOnly,
    ganttCheckinOnly,
    teamBoardBuckets,
    selectedObjectiveId,
    setSelectedObjectiveId,
    ganttSectionRef,
    missingMonthlyProjectIds,
    hierarchyGanttRows,
    portfolioProjects,
    projectCategories,
    selectedProjectId,
    linkProjectToObjective,
    setProjectSheetId,
    handleProjectScheduleChange,
    reloadProjectCategories,
    contentPanel,
    setContentPanel,
  } = ws;

  const managerTeamMode = isManager && dashboardView !== 'mine';
  const pageTitle = managerTeamMode ? MBO_COPY.appTitleManager : MBO_COPY.appTitle;
  const pageSubtitle = managerTeamMode ? MBO_COPY.appSubtitleManager : MBO_COPY.appSubtitle;
  const showMissingBanner =
    missingMonthlyProjectIds.length > 0 &&
    !ganttCheckinOnly &&
    contentPanel === 'schedule';

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{pageTitle}</h1>
          <p className="mt-1 text-xs text-slate-500">{pageSubtitle}</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          disabled={goalsLocked && !canManagerCreateWhileLocked}
          data-testid="mbo-create-objective-open"
          onClick={openCreateObjectiveModal}
        >
          {MBO_COPY.createGoal}
        </Button>
      </header>

      <MboCycleStatusBar
        organizationId={orgId}
        canEditCycle={isOrgAdmin}
        onSettingsChange={setCycleSettings}
        isManager={isManager}
        pendingChangeApprovals={pendingChangeApprovals}
        onOpenPendingApprovals={() => setPendingApprovalsOpen(true)}
      />

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <MboDashboardToolbar ws={ws} />

        {managerTeamMode ? (
          <>
            <MboManagerKpiStrip
              kpis={managerKpis}
              managerMode
              onShowRisk={handleManagerRiskFilter}
              onShowCheckinPending={handleManagerCheckinFilter}
            />
            <MboTeamMemberChips
              chips={teamMemberChips.filter(
                (c) => !personQuery.trim() || memberMatchesQuery(c.displayName, personQuery),
              )}
              selectedUserIds={selectedMemberUserIds}
              onChangeSelected={(ids) => {
                setSelectedMemberUserIds(ids);
                setGanttRiskOnly(false);
                setGanttCheckinOnly(false);
              }}
            />
          </>
        ) : (
          <MboHubSummaryCards hubSummary={hubSummary} />
        )}

        {(ganttRiskOnly || ganttCheckinOnly) && managerTeamMode ? (
          <p className="text-xs font-semibold text-indigo-800">
            {ganttRiskOnly ? MBO_COPY.filterDelayed : MBO_COPY.filterMissingReport}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={() => {
                setGanttRiskOnly(false);
                setGanttCheckinOnly(false);
              }}
            >
              {MBO_COPY.filterClear}
            </Button>
          </p>
        ) : null}

        <MboContentPanelSwitch
          contentPanel={contentPanel}
          onChange={setContentPanel}
          showWeightHint={managerTeamMode && !weightValidation.valid && contentPanel === 'goals'}
          weightHint={MBO_COPY.weightInvalid(weightValidation.totalWeight, weightValidation.difference)}
        />
      </div>

      <section ref={ganttSectionRef} className="min-h-[200px]" data-testid="mbo-main-panel">
        <ContentFadeIn motionKey={contentPanel}>
          {contentPanel === 'schedule' ? (
            <div className="space-y-2">
              {showMissingBanner ? (
                <p
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
                  data-testid="mbo-missing-monthly-badge"
                >
                  {MBO_COPY.missingReportBanner(ws.currentPeriodYm, missingMonthlyProjectIds.length)}
                </p>
              ) : null}
              <MboHierarchyGanttView
                rows={hierarchyGanttRows}
                projects={portfolioProjects}
                categories={projectCategories}
                organizationId={orgId}
                selectedProjectId={selectedProjectId}
                scheduleEditable
                onSelectProject={linkProjectToObjective}
                onOpenProjectSheet={(id) => {
                  linkProjectToObjective(id);
                  setProjectSheetId(id);
                }}
                onScheduleChange={handleProjectScheduleChange}
                onCategoriesChanged={() => void reloadProjectCategories()}
                onOpenCreateObjective={openCreateObjectiveModal}
                onOpenObjectiveDetail={(id) => setDetailObjectiveId(id)}
              />
            </div>
          ) : (
            <MboTeamObjectiveBoard
              buckets={teamBoardBuckets}
              selectedObjectiveId={selectedObjectiveId}
              emptyKind={
                teamBoardBuckets.length === 0 &&
                (personQuery.trim() || selectedMemberUserIds.length > 0)
                  ? 'filtered'
                  : teamBoardBuckets.length === 0
                    ? 'no_data'
                    : undefined
              }
              onSelectObjective={(id) => setSelectedObjectiveId(id)}
              onShowOnSchedule={(id) => {
                setSelectedObjectiveId(id);
                setContentPanel('schedule');
              }}
              onOpenDetail={(id) => setDetailObjectiveId(id)}
            />
          )}
        </ContentFadeIn>
      </section>
    </div>
  );
};

const MboDashboardToolbar: React.FC<Props> = ({ ws }) => {
  const {
    isManager,
    dashboardView,
    setDashboardView,
    listScope,
    setListScope,
    personQuery,
    setPersonQuery,
  } = ws;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {isManager ? (
        <SegmentedControl
          value={dashboardView === 'mine' ? 'mine' : 'team_overview'}
          onChange={(v) => setDashboardView(v)}
          activeClassName="bg-white text-indigo-700 shadow-xs"
          options={[
            { value: 'team_overview', label: MBO_COPY.tabTeam },
            { value: 'mine', label: MBO_COPY.tabMine },
          ]}
        />
      ) : (
        <SegmentedControl
          value={listScope === 'visible' ? 'visible' : 'mine'}
          onChange={(v) => setListScope(v)}
          activeClassName="bg-white text-indigo-700 shadow-xs"
          options={[
            { value: 'mine', label: MBO_COPY.tabMine },
            { value: 'visible', label: MBO_COPY.tabShared },
          ]}
        />
      )}
      {isManager && dashboardView !== 'mine' ? (
        <div className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-bold text-slate-600">
          <span>{MBO_COPY.searchMember}</span>
          <SearchField
            value={personQuery}
            onChange={setPersonQuery}
            placeholder={MBO_COPY.searchMemberPlaceholder}
          />
        </div>
      ) : null}
    </div>
  );
};

function MboContentPanelSwitch({
  contentPanel,
  onChange,
  showWeightHint,
  weightHint,
}: {
  contentPanel: MboContentPanel;
  onChange: (panel: MboContentPanel) => void;
  showWeightHint: boolean;
  weightHint: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div data-testid="mbo-content-panel">
        <SegmentedControl
          value={contentPanel}
          onChange={onChange}
          activeClassName="bg-white text-indigo-700 shadow-xs"
          options={[
            { value: 'schedule', label: MBO_COPY.panelSchedule },
            { value: 'goals', label: MBO_COPY.panelGoals },
          ]}
        />
      </div>
      {showWeightHint ? (
        <p className="text-[11px] font-semibold text-amber-800">{weightHint}</p>
      ) : null}
    </div>
  );
}

const MboHubSummaryCards: React.FC<{
  hubSummary: { mineCount: number; mineAvg: number; missingMonthly: number };
}> = ({ hubSummary }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="mbo-hub-summary">
    {[
      { label: MBO_COPY.hubMineCount, value: hubSummary.mineCount },
      { label: MBO_COPY.hubMineAvg, value: `${hubSummary.mineAvg}%` },
      { label: MBO_COPY.hubMissingReport, value: hubSummary.missingMonthly },
    ].map((card) => (
      <div key={card.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="text-[11px] font-semibold text-slate-500">{card.label}</div>
        <div className={`mt-1 text-xl font-black text-slate-900 ${uiMotion.PROGRESS_WIDTH}`}>
          {card.value}
        </div>
      </div>
    ))}
  </div>
);
