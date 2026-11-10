import React from 'react';
import { MboCycleStatusBar } from './MboCycleStatusBar';
import { MboManagerKpiStrip } from './MboManagerKpiStrip';
import { MboTeamMemberChips } from './MboTeamMemberChips';
import { MboTeamObjectiveBoard } from './MboTeamObjectiveBoard';
import { MboHierarchyGanttView } from './MboHierarchyGanttView';
import { memberMatchesQuery } from '../domain/mboVisibilityEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
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
    teamObjectivesForManager,
    setDetailObjectiveId,
    weightValidation,
    dashboardView,
    personQuery,
    managerKpis,
    handleManagerRiskFilter,
    handleManagerCheckinFilter,
    hubSummary,
    teamMemberChips,
    selectedMemberUserIds,
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
    setChangeRequestObjectiveId,
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
        <button
          type="button"
          disabled={goalsLocked && !canManagerCreateWhileLocked}
          data-testid="mbo-create-objective-open"
          onClick={openCreateObjectiveModal}
          className={`inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-bold shadow-xs ${
            goalsLocked && !canManagerCreateWhileLocked
              ? 'cursor-not-allowed bg-slate-300 text-slate-500'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {MBO_COPY.createGoal}
        </button>
      </header>

      <MboCycleStatusBar
        organizationId={orgId}
        canEditCycle={isOrgAdmin}
        onSettingsChange={setCycleSettings}
        isManager={isManager}
        pendingChangeApprovals={pendingChangeApprovals}
        onOpenPendingApprovals={() => {
          const pending = teamObjectivesForManager.find((o) => o.status === 'submitted');
          if (pending) setDetailObjectiveId(pending.id);
          else showToast('대기 중인 변경·승인 요청이 없습니다.', 'info');
        }}
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
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => {
                setGanttRiskOnly(false);
                setGanttCheckinOnly(false);
              }}
            >
              {MBO_COPY.filterClear}
            </button>
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
            onSelectObjective={(id) => {
              setSelectedObjectiveId(id);
              setContentPanel('schedule');
            }}
            onOpenDetail={(id) => setDetailObjectiveId(id)}
          />
        )}
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
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {(
            [
              { id: 'team_overview' as const, label: MBO_COPY.tabTeam },
              { id: 'mine' as const, label: MBO_COPY.tabMine },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setDashboardView(chip.id)}
              className={`min-h-11 rounded-lg px-3 text-xs font-bold ${
                dashboardView === chip.id ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {(
            [
              { id: 'mine' as const, label: MBO_COPY.tabMine },
              { id: 'visible' as const, label: MBO_COPY.tabShared },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setListScope(chip.id)}
              className={`min-h-11 rounded-lg px-3 text-xs font-bold ${
                listScope === chip.id ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
      {isManager && dashboardView !== 'mine' ? (
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-bold text-slate-600">
          {MBO_COPY.searchMember}
          <input
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold"
            value={personQuery}
            onChange={(e) => setPersonQuery(e.target.value)}
            placeholder="이름 또는 초성"
          />
        </label>
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
      <div className="inline-flex rounded-xl bg-slate-100 p-1" data-testid="mbo-content-panel">
        {(
          [
            { id: 'schedule' as const, label: MBO_COPY.panelSchedule },
            { id: 'goals' as const, label: MBO_COPY.panelGoals },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`min-h-11 rounded-lg px-4 text-xs font-bold ${
              contentPanel === tab.id ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
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
        <div className="mt-1 text-xl font-black text-slate-900">{card.value}</div>
      </div>
    ))}
  </div>
);
