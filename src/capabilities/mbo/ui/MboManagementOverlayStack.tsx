import React from 'react';
import { MboPlanApprovalModal } from './MboPlanApprovalModal';
import { MboProjectSheetModal } from './MboProjectSheetModal';
import { MboObjectiveDetailModal } from './MboObjectiveDetailModal';
import { MboRevisionTimelineModal } from './MboRevisionTimelineModal';
import { MboGoalChangeRequestModal } from './MboGoalChangeRequestModal';
import { MboReviseGoalModal } from './MboReviseGoalModal';
import { OrganizationMemberPickerModal } from './OrganizationMemberPickerModal';
import { MboCreateObjectiveModal } from './MboCreateObjectiveModal';
import { MboObjectiveRejectModal } from './MboObjectiveRejectModal';
import { MboObjectiveDeleteModal } from './MboObjectiveDeleteModal';
import { MboService } from '../services/mboService';
import { canManageObjectiveOwner } from '../services/mboOrgScopeService';
import { showToast } from '@/shared/feedback/uiFeedback';
import type { MboManagementWorkspace } from '../hooks/useMboManagementWorkspace';
import { MBO_COPY } from './mboUiCopy';

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
          objectiveTitle={w.objectives.find((o) => o.id === w.planApprovalObjectiveId)?.title ?? '목표'}
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
            showToast('목표 계획 결재가 요청되었습니다.', 'success');
          }}
          onSkipToLocalSubmit={() => w.handleTransitionStatus(w.planApprovalObjectiveId!, 'submitted')}
        />
      ) : null}

      <MboProjectSheetModal
        open={Boolean(w.projectSheetId && w.sheetProject)}
        project={w.sheetProject}
        onClose={() => w.setProjectSheetId(null)}
        canEdit={Boolean(
          w.sheetProject?.ownerId &&
            w.viewerUserId &&
            w.sheetProject.ownerId === w.viewerUserId,
        )}
        onScheduleChange={
          w.sheetProject &&
          w.orgId &&
          w.sheetProject.ownerId &&
          w.sheetProject.ownerId === w.viewerUserId
            ? async (range) => {
                await MboService.updateProject(w.sheetProject!.id, w.orgId!, {
                  start_date: range.startDate,
                  target_date: range.targetDate,
                });
                await w.projectQuery?.refetch?.();
              }
            : undefined
        }
        onSaveMemoProgress={
          w.sheetProject &&
          w.orgId &&
          w.sheetProject.ownerId &&
          w.sheetProject.ownerId === w.viewerUserId
            ? async ({ ownerMemo, progressRate, status }) => {
                await MboService.updateProject(w.sheetProject!.id, w.orgId!, {
                  owner_memo: ownerMemo,
                  progress_rate: progressRate,
                  status,
                });
                await w.projectQuery?.refetch?.();
                await w.objQuery?.refetch?.();
              }
            : undefined
        }
      />

      <MboCreateObjectiveModal
        open={w.showCreateModal}
        onClose={() => w.setShowCreateModal(false)}
        onSubmit={w.handleCreateObjective}
        createBusy={w.createBusy}
        newLevel={w.newLevel}
        onLevelChange={w.setNewLevel}
        newWeight={w.newWeight}
        onWeightChange={w.setNewWeight}
        newParentId={w.newParentId}
        onParentIdChange={w.setNewParentId}
        newDepartmentId={w.newDepartmentId}
        onDepartmentIdChange={(id, name) => {
          w.setNewDepartmentId(id);
          w.setNewDept(name);
        }}
        departmentOptions={w.departmentOptionsForCreate}
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
        createGate={w.createGate}
        objectives={w.rawObjectiveRows}
        selectedOwnerMember={w.selectedOwnerMember}
        onOpenOwnerPicker={() => w.setOwnerPickerOpen(true)}
        onOpenSharePicker={() => w.setSharePickerOpen(true)}
        immediateSuperior={w.immediateSuperior}
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
                w.openObjectiveOnSchedule(detail.id);
              }}
              onRequestApproval={(id) => {
                if (w.requirePlanApproval && w.hasApprovalWorkflow) {
                  w.setPlanApprovalObjectiveId(id);
                  return;
                }
                if (w.requirePlanApproval && !w.hasApprovalWorkflow) {
                  showToast(
                    '전자결재가 꺼져 있어 계획 결재를 올릴 수 없습니다. 관리자에게 문의하세요.',
                    'warning',
                  );
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
              onSaveWeight={
                w.orgId
                  ? async (id, weight) => {
                      try {
                        await MboService.updateObjective(
                          id,
                          w.orgId!,
                          { weight, target_value: String(weight) },
                          {
                            isManager: w.isManager,
                            bypassGoalCycleLock: w.canOverrideGoalLockForOwner(
                              w.objectives.find((o) => o.id === id)?.ownerId,
                            ),
                          },
                        );
                        await w.objQuery?.refetch?.();
                        w.setLocalObjectives((prev) =>
                          prev.map((obj) =>
                            obj.id === id
                              ? { ...obj, weight, targetValue: String(weight) }
                              : obj,
                          ),
                        );
                        showToast(MBO_COPY.weightSaved, 'success');
                      } catch (cause) {
                        showToast(
                          cause instanceof Error ? cause.message : MBO_COPY.weightSaveFailed,
                          'error',
                        );
                        throw cause;
                      }
                    }
                  : undefined
              }
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
        objectiveTitle={w.objectives.find((o) => o.id === w.changeRequestObjectiveId)?.title ?? '목표'}
        busy={w.changeRequestBusy}
        onClose={() => w.setChangeRequestObjectiveId(null)}
        onSubmit={w.submitGoalChangeRequest}
      />

      <MboReviseGoalModal
        open={Boolean(w.reviseGoalId)}
        goalId={w.reviseGoalId || ''}
        organizationId={w.orgId}
        goalLevel={w.objectives.find((o) => o.id === w.reviseGoalId)?.level}
        currentTargetValue={w.objectives.find((o) => o.id === w.reviseGoalId)?.targetValue}
        currentDueDate={w.objectives.find((o) => o.id === w.reviseGoalId)?.targetDate}
        currentWeight={w.objectives.find((o) => o.id === w.reviseGoalId)?.weight}
        currentParentId={w.objectives.find((o) => o.id === w.reviseGoalId)?.parentId}
        existingGoalRefs={w.existingGoalRefs}
        objectiveTitlesById={
          new Map(w.objectives.map((o) => [o.id, o.title] as const))
        }
        isManager={w.isManager}
        bypassGoalCycleLock={w.canOverrideGoalLockForOwner(
          w.objectives.find((o) => o.id === w.reviseGoalId)?.ownerId,
        )}
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
