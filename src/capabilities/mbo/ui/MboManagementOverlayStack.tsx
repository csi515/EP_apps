import React from 'react';
import { MboPlanApprovalModal } from './MboPlanApprovalModal';
import { MboProjectSheetModal } from './MboProjectSheetModal';
import { Modal } from '@/shared/components/ui/Modal';
import { MboQuarterlyReviewForm, type FeedbackItem } from './MboQuarterlyReviewForm';
import { MboObjectiveDetailModal } from './MboObjectiveDetailModal';
import { MboRevisionTimelineModal } from './MboRevisionTimelineModal';
import { MboGoalChangeRequestModal } from './MboGoalChangeRequestModal';
import { MboReviseGoalModal } from './MboReviseGoalModal';
import { OrganizationMemberPickerModal } from './OrganizationMemberPickerModal';
import { MboCreateObjectiveModal } from './MboCreateObjectiveModal';
import { MboObjectiveRejectModal } from './MboObjectiveRejectModal';
import { MboObjectiveDeleteModal } from './MboObjectiveDeleteModal';
import {
  classifyPendingApproval,
  MboPendingApprovalsModal,
} from './MboPendingApprovalsModal';
import { MboService } from '../services/mboService';
import { canManageObjectiveOwner } from '../services/mboOrgScopeService';
import { showToast } from '@/shared/feedback/uiFeedback';
import { MBO_COPY } from './mboUiCopy';
import type { MboManagementWorkspace } from '../hooks/useMboManagementWorkspace';

type Props = {
  ws: MboManagementWorkspace;
};

export const MboManagementOverlayStack: React.FC<Props> = ({ ws }) => {
  const w = ws;

  return (
    <>
      {w.planApprovalObjectiveId ? (
        <MboPlanApprovalModal
          open
          organizationId={w.orgId ?? ''}
          objectiveId={w.planApprovalObjectiveId}
          objectiveTitle={w.objectives.find((o) => o.id === w.planApprovalObjectiveId)?.title ?? 'MBO 목표'}
          objectiveDescription={w.objectives.find((o) => o.id === w.planApprovalObjectiveId)?.description}
          successCriteria={w.objectives.find((o) => o.id === w.planApprovalObjectiveId)?.successCriteria}
          ownerName={w.objectives.find((o) => o.id === w.planApprovalObjectiveId)?.ownerName}
          objectiveStatus={w.objectives.find((o) => o.id === w.planApprovalObjectiveId)?.status ?? 'draft'}
          requirePlanApproval={w.requirePlanApproval}
          hasApprovalWorkflow={w.hasApprovalWorkflow}
          requesterId={w.authUser?.id || w.activeUser?.id || ''}
          requesterName={w.activeUser?.name || w.authUser?.email || '기안자'}
          onClose={() => w.setPlanApprovalObjectiveId(null)}
          onSubmitted={() => {
            w.handleTransitionStatus(w.planApprovalObjectiveId!, 'submitted');
            showToast('MBO 계획 결재가 상신되었습니다.', 'success');
          }}
          onSkipToLocalSubmit={() => w.handleTransitionStatus(w.planApprovalObjectiveId!, 'submitted')}
        />
      ) : null}

      <MboProjectSheetModal
        open={Boolean(w.projectSheetId && w.sheetProject)}
        project={w.sheetProject}
        goalsLocked={w.goalsLocked}
        missingMonthly={w.sheetProject ? w.missingMonthlyProjectIds.includes(w.sheetProject.id) : false}
        onClose={() => w.setProjectSheetId(null)}
        onOpenMonthlyCheck={() => {
          if (!w.sheetProject) return;
          w.setSelectedProjectId(w.sheetProject.id);
          w.setMonthlyCheckProjectId(w.sheetProject.id);
          w.setProjectSheetId(null);
        }}
        onScheduleChange={
          w.sheetProject ? (range) => void w.handleProjectScheduleChange(w.sheetProject!.id, range) : undefined
        }
      />

      {w.monthlyCheckProject ? (
        <Modal
          isOpen
          onClose={() => w.setMonthlyCheckProjectId(null)}
          title={`${MBO_COPY.monthlyReport} · ${w.monthlyCheckProject.title}`}
          maxWidth="2xl"
          intent="form"
        >
          <MboQuarterlyReviewForm
            projectId={w.monthlyCheckProject.id}
            projectTitle={w.monthlyCheckProject.title}
            logs={w.logs}
            feedbacks={w.localFeedbacks}
            authorName={w.activeUser?.name || w.authUser?.email || '실무자'}
            onCreateLog={async (newLog) => {
              if (!w.orgId) throw new Error('조직 컨텍스트가 없습니다.');
              await MboService.recordProgressLog({
                organization_id: w.orgId,
                project_id: newLog.projectId,
                author_name: newLog.authorName,
                log_date: newLog.logDate,
                progress_rate: newLog.progressRate,
                achievements: newLog.achievements,
                issues_and_actions: newLog.issuesAndActions ?? null,
                next_steps: newLog.nextSteps ?? null,
                period_ym: newLog.periodYm,
              });
              await w.logQuery?.refetch?.();
              await w.projectQuery?.refetch?.();
              await w.objQuery?.refetch?.();
            }}
            onCreateFeedback={async (newFb) => {
              if (!w.orgId) throw new Error('조직 컨텍스트가 없습니다.');
              await MboService.createFeedbackComment({
                organization_id: w.orgId,
                project_id: newFb.projectId,
                author_name: newFb.authorName,
                author_role: newFb.authorRole,
                feedback_type: newFb.feedbackType,
                content: newFb.content,
              });
              const rows = await MboService.listFeedbackComments(w.orgId, newFb.projectId);
              w.setLocalFeedbacks(
                rows.map((row) => ({
                  id: row.id,
                  projectId: row.project_id,
                  authorName: row.author_name,
                  authorRole: row.author_role,
                  feedbackType: row.feedback_type as FeedbackItem['feedbackType'],
                  content: row.content,
                  createdAt: row.created_at ? new Date(row.created_at).toLocaleTimeString() : '',
                }))
              );
            }}
          />
        </Modal>
      ) : null}

      <MboCreateObjectiveModal
        open={w.showCreateModal}
        onClose={() => w.setShowCreateModal(false)}
        onSubmit={w.handleCreateObjective}
        newLevel={w.newLevel}
        onLevelChange={w.setNewLevel}
        newWeight={w.newWeight}
        onWeightChange={w.setNewWeight}
        newParentId={w.newParentId}
        onParentIdChange={w.setNewParentId}
        newTitle={w.newTitle}
        onTitleChange={w.setNewTitle}
        newCriteria={w.newCriteria}
        onCriteriaChange={w.setNewCriteria}
        newVisibility={w.newVisibility}
        onVisibilityChange={w.setNewVisibility}
        newShareMemberIds={w.newShareMemberIds}
        newStartDate={w.newStartDate}
        newTargetDate={w.newTargetDate}
        onScheduleChange={({ startDate, targetDate }) => {
          w.setNewStartDate(startDate);
          w.setNewTargetDate(targetDate);
        }}
        creatableLevels={w.creatableLevels}
        maxCreatableLevel={w.maxCreatableLevel}
        goalActor={w.goalActor}
        existingGoalRefs={w.existingGoalRefs}
        eligibleParents={w.eligibleParents}
        objectives={w.rawObjectiveRows}
        selectedOwnerMember={w.selectedOwnerMember}
        onOpenOwnerPicker={() => w.setOwnerPickerOpen(true)}
        onOpenSharePicker={() => w.setSharePickerOpen(true)}
        immediateSuperior={w.immediateSuperior}
      />

      <MboPendingApprovalsModal
        open={w.pendingApprovalsOpen}
        items={w.teamObjectivesForManager
          .filter((o) => o.status === 'submitted')
          .map((objective) => ({
            objective,
            kind: classifyPendingApproval(objective, w.goalsLocked),
          }))}
        onClose={() => w.setPendingApprovalsOpen(false)}
        onOpenDetail={(id) => w.setDetailObjectiveId(id)}
      />

      {w.detailObjectiveId ? (
        (() => {
          const detail = w.objectives.find((o) => o.id === w.detailObjectiveId);
          if (!detail) return null;
          const hasLinked = w.portfolioProjects.some((p) => p.objectiveId === detail.id);
          const canApproveReject =
            w.isManager &&
            (w.isOrgAdmin ||
              (Boolean(w.orgScope) &&
                canManageObjectiveOwner(
                  w.orgScope!,
                  detail.ownerId,
                  w.viewerUserId,
                  w.isOrgAdmin,
                )));
          return (
            <MboObjectiveDetailModal
              objective={detail}
              goalsLocked={w.goalsLocked}
              canOverrideGoalLock={w.canOverrideGoalLockForOwner(detail.ownerId)}
              canApproveReject={canApproveReject}
              hasLinkedProject={hasLinked}
              onClose={() => w.setDetailObjectiveId(null)}
              onCreateProject={hasLinked ? undefined : () => void w.handleEnsureProjectForObjective(detail)}
              onOpenProjects={() => {
                w.setDetailObjectiveId(null);
                w.setContentPanel('schedule');
                w.ganttSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              onRequestApproval={(id) => {
                if (w.requirePlanApproval && w.hasApprovalWorkflow) {
                  w.setPlanApprovalObjectiveId(id);
                  return;
                }
                w.handleTransitionStatus(id, 'submitted');
              }}
              onApprove={(id) => w.handleTransitionStatus(id, 'approved')}
              onOpenRejectModal={(id) => w.setShowRejectModal(id)}
              onOpenRevisionHistory={(id) => w.setHistoryGoalId(id)}
              onRequestGoalChange={(id) => w.setChangeRequestObjectiveId(id)}
              onOpenRevise={(id) => w.setReviseGoalId(id)}
              onOpenDelete={(id) => {
                w.setDeleteGoalId(id);
                w.setDeleteReason('');
              }}
              onChangeVisibility={(id, visibility) => void w.handleChangeVisibility(id, visibility)}
            />
          );
        })()
      ) : null}

      <MboRevisionTimelineModal
        open={Boolean(w.historyGoalId)}
        goalId={w.historyGoalId || ''}
        currentTargetValue={w.objectives.find((o) => o.id === w.historyGoalId)?.targetValue}
        currentDueDate={w.objectives.find((o) => o.id === w.historyGoalId)?.targetDate}
        onClose={() => w.setHistoryGoalId(null)}
      />

      <MboGoalChangeRequestModal
        open={Boolean(w.changeRequestObjectiveId)}
        objectiveTitle={w.objectives.find((o) => o.id === w.changeRequestObjectiveId)?.title ?? 'MBO 목표'}
        busy={w.changeRequestBusy}
        onClose={() => w.setChangeRequestObjectiveId(null)}
        onSubmit={w.submitGoalChangeRequest}
      />

      <MboReviseGoalModal
        open={Boolean(w.reviseGoalId)}
        goalId={w.reviseGoalId || ''}
        currentTargetValue={w.objectives.find((o) => o.id === w.reviseGoalId)?.targetValue}
        currentDueDate={w.objectives.find((o) => o.id === w.reviseGoalId)?.targetDate}
        onClose={() => w.setReviseGoalId(null)}
        onRevised={() => {
          void w.objQuery?.refetch?.();
          w.setLocalObjectives((prev) =>
            prev.map((obj) =>
              obj.id === w.reviseGoalId
                ? { ...obj, revision: obj.revision + 1, isRevised: true, revisionCount: obj.revision + 1 }
                : obj
            )
          );
        }}
      />

      <MboObjectiveRejectModal
        objectiveId={w.showRejectModal}
        rejectionInput={w.rejectionInput}
        onRejectionChange={w.setRejectionInput}
        onClose={() => {
          w.setShowRejectModal(null);
          w.setRejectionInput('');
        }}
        onConfirm={(id, reason) => w.handleTransitionStatus(id, 'rejected', reason)}
      />

      <MboObjectiveDeleteModal
        open={Boolean(w.deleteGoalId)}
        deleteReason={w.deleteReason}
        onReasonChange={w.setDeleteReason}
        onClose={() => {
          w.setDeleteGoalId(null);
          w.setDeleteReason('');
        }}
        onConfirm={w.handleConfirmSoftDelete}
      />

      <OrganizationMemberPickerModal
        open={w.ownerPickerOpen}
        mode="single"
        title="담당자 선택"
        departments={w.orgDepartments}
        members={w.orgMembers}
        selectedIds={w.newOwnerMemberId ? [w.newOwnerMemberId] : []}
        onChange={(ids) => {
          const id = ids[0] ?? '';
          w.setNewOwnerMemberId(id);
          const member = w.orgMembers.find((m) => m.id === id);
          if (member) {
            w.setNewDepartmentId(member.departmentId ?? '');
            w.setNewDept(member.departmentName ?? '');
          } else {
            w.setNewDepartmentId('');
            w.setNewDept('');
          }
        }}
        onClose={() => w.setOwnerPickerOpen(false)}
        onConfirm={() => w.setOwnerPickerOpen(false)}
      />

      <OrganizationMemberPickerModal
        open={w.sharePickerOpen}
        mode="multiple"
        title="선택 공개 대상"
        departments={w.orgDepartments}
        members={w.orgMembers}
        selectedIds={w.newShareMemberIds}
        onChange={w.setNewShareMemberIds}
        onClose={() => {
          w.setSharePickerOpen(false);
          w.setSharePickerObjectiveId(null);
        }}
        onConfirm={() => {
          if (w.sharePickerObjectiveId && w.orgId) {
            void MboService.updateGoalVisibility(w.orgId, w.sharePickerObjectiveId, 'PARTIAL', w.newShareMemberIds)
              .then(async () => {
                const shares = await MboService.listObjectiveSharesByOrg(w.orgId!);
                w.setSharesByObjective(shares);
                void w.objQuery?.refetch?.();
                showToast('선택 공개 대상이 저장되었습니다.', 'success');
              })
              .catch((err) => {
                showToast(err instanceof Error ? err.message : '공유 저장 실패', 'error');
              })
              .finally(() => {
                w.setSharePickerOpen(false);
                w.setSharePickerObjectiveId(null);
              });
            return;
          }
          w.setSharePickerOpen(false);
        }}
      />
    </>
  );
};
