import { useCallback, type FormEvent } from 'react';
import { canTransitionMboStatus, type MboStatus } from '../domain/mboEngine';
import { canEditExecutionProject } from '../domain/mboTwoTierLockEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import { MBO_COPY } from '../ui/mboUiCopy';
import { MboService } from '../services/mboService';
import { listEligibleParentGoals, resolveMaxCreatableLevel, validateGoalCreation } from '../domain/mboGoalHierarchy';
import type { MboVisibilityType } from '../domain/mboVisibilityEngine';
import type { ObjectiveNode } from '../ui/MboObjectiveTreeViewer';
import type { MboManagementWorkspaceState } from './useMboManagementWorkspaceState';
import type { MboManagementObjectivesDerived } from './useMboManagementObjectivesDerived';
import type { MboManagementDashboardDerived } from './useMboManagementDashboardDerived';

function statusLabelKo(status: MboStatus): string {
  return MBO_COPY.statusLabel[status] ?? status;
}

export function useMboManagementWorkspaceActions(
  state: MboManagementWorkspaceState,
  obj: MboManagementObjectivesDerived,
  dash: MboManagementDashboardDerived,
) {
  const objectives = obj.objectives;
  const goalActor = obj.goalActor;
  const existingGoalRefs = obj.existingGoalRefs;
  const selectedOwnerMember = state.selectedOwnerMember;
  const canManagerCreateWhileLocked = dash.canManagerCreateWhileLocked;
  const {
    goalsLocked,
    viewerMemberId,
    newOwnerMemberId,
    setNewOwnerMemberId,
    selectedObjectiveId,
    orgDepartments,
    orgMembers,
    setNewLevel,
    setNewParentId,
    setNewDepartmentId,
    setNewDept,
    setShowCreateModal,
    ganttSectionRef,
    setGanttCheckinOnly,
    setGanttRiskOnly,
    setContentPanel,
    orgId,
    projectQuery,
    setSelectedObjectiveId,
    setSelectedProjectId,
    changeRequestObjectiveId,
    setChangeRequestBusy,
    isManager,
    mutateUpdate,
    objQuery,
    setChangeRequestObjectiveId,
    newTitle,
    newLevel,
    newParentId,
    newDepartmentId,
    newDept,
    newVisibility,
    newShareMemberIds,
    newCriteria,
    newStartDate,
    newTargetDate,
    newWeight,
    mutateCreate,
    setSharesByObjective,
    setNewTitle,
    setNewShareMemberIds,
    setNewVisibility,
    sharesByObjective,
    setSharePickerObjectiveId,
    setSharePickerOpen,
    deleteGoalId,
    deleteReason,
    setDeleteGoalId,
    setDeleteReason,
    isOrgAdmin,
    orgScope,
  } = state;

  const openCreateObjectiveModal = useCallback(() => {
    const canCreateWhileLocked = isManager && (isOrgAdmin || orgScope?.isSubtreeManager === true);
    if (goalsLocked && !canCreateWhileLocked) {
      showToast(MBO_COPY.lockBlockCreate, 'warning');
      return;
    }
    const ownerMemberId = newOwnerMemberId || viewerMemberId || '';
    if (ownerMemberId && !newOwnerMemberId) {
      setNewOwnerMemberId(ownerMemberId);
    }
    const ownerMember = orgMembers.find((m) => m.id === ownerMemberId);
    if (ownerMember) {
      setNewDepartmentId(ownerMember.departmentId ?? '');
      setNewDept(ownerMember.departmentName ?? '');
    } else if (goalActor.ledDepartmentIds.length === 1) {
      setNewDepartmentId(goalActor.ledDepartmentIds[0]);
      const ledName = orgDepartments.find((d) => d.id === goalActor.ledDepartmentIds[0])?.name;
      if (ledName) setNewDept(ledName);
    } else {
      setNewDepartmentId('');
      setNewDept('');
    }
    const defaultLevel = resolveMaxCreatableLevel(goalActor);
    setNewLevel(defaultLevel);
    const parents = listEligibleParentGoals(defaultLevel, existingGoalRefs);
    const preferredParent =
      (selectedObjectiveId && parents.find((p) => p.id === selectedObjectiveId)?.id) ||
      parents[0]?.id ||
      '';
    setNewParentId(defaultLevel === 'company' ? '' : preferredParent);
    setShowCreateModal(true);
  }, [
    goalsLocked,
    isManager,
    isOrgAdmin,
    orgScope?.isSubtreeManager,
    viewerMemberId,
    newOwnerMemberId,
    goalActor,
    existingGoalRefs,
    selectedObjectiveId,
    orgDepartments,
    orgMembers,
    setNewOwnerMemberId,
    setNewDepartmentId,
    setNewDept,
    setNewLevel,
    setNewParentId,
    setShowCreateModal,
  ]);

  const handleManagerRiskFilter = useCallback(() => {
    setGanttCheckinOnly(false);
    setGanttRiskOnly((on) => !on);
    setContentPanel('schedule');
    ganttSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [setContentPanel, ganttSectionRef, setGanttCheckinOnly, setGanttRiskOnly]);

  const handleManagerCheckinFilter = useCallback(() => {
    setGanttRiskOnly(false);
    setGanttCheckinOnly((on) => !on);
    setContentPanel('schedule');
    ganttSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [setContentPanel, ganttSectionRef, setGanttRiskOnly, setGanttCheckinOnly]);

  const handleEnsureProjectForObjective = useCallback(
    async (objective: ObjectiveNode) => {
      if (!orgId) return;
      try {
        const project = await MboService.ensureDefaultProject(orgId, {
          id: objective.id,
          title: objective.title,
          owner_id: objective.ownerId ?? null,
          owner_name: objective.ownerName,
          start_date: objective.startDate,
          target_date: objective.targetDate,
        });
        setSelectedObjectiveId(objective.id);
        setSelectedProjectId(project.id);
        void projectQuery?.refetch?.();
        ganttSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast(MBO_COPY.projectCreatedHint, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '프로젝트 생성 실패', 'error');
      }
    },
    [orgId, projectQuery, setSelectedObjectiveId, setSelectedProjectId, ganttSectionRef],
  );

  const handleProjectScheduleChange = useCallback(
    async (projectId: string, range: { startDate: string; targetDate: string }) => {
      if (!orgId) return;
      // Level-2 실행 일정은 목표 잠금과 무관
      if (!canEditExecutionProject()) {
        showToast(MBO_COPY.lockBlockSchedule, 'warning');
        return;
      }
      try {
        await MboService.updateProject(projectId, orgId, {
          start_date: range.startDate,
          target_date: range.targetDate,
        });
        void projectQuery?.refetch?.();
        showToast(MBO_COPY.scheduleSaved, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : MBO_COPY.scheduleSaveFailed, 'error');
      }
    },
    [orgId, projectQuery],
  );

  const submitGoalChangeRequest = useCallback(
    (reason: string) => {
      if (!changeRequestObjectiveId || !orgId) return;
      const trimmed = reason.trim();
      if (!trimmed) {
        showToast(MBO_COPY.changeRequestNeedReason, 'warning');
        return;
      }
      const target = objectives.find((o) => o.id === changeRequestObjectiveId);
      if (!target) return;
      const transition = canTransitionMboStatus(target.status, 'submitted', { isManager });
      if (!transition.allowed) {
        showToast(transition.reason || '변경 요청을 보낼 수 없는 상태입니다.', 'warning');
        return;
      }
      setChangeRequestBusy(true);
      mutateUpdate(
        {
          resource: 'mbo_objectives',
          id: changeRequestObjectiveId,
          values: {
            status: 'submitted',
            // description에 append하지 않음 — 사유는 rejection_reason 슬롯(변경 요청 메타)
            rejection_reason: trimmed,
          },
        },
        {
          onSuccess: () => {
            void objQuery?.refetch?.();
            showToast(MBO_COPY.changeRequestAppendedHint, 'success');
            setChangeRequestObjectiveId(null);
          },
          onError: (err) => {
            showToast(err instanceof Error ? err.message : '요청 실패', 'error');
          },
          onSettled: () => setChangeRequestBusy(false),
        },
      );
    },
    [
      changeRequestObjectiveId,
      orgId,
      objectives,
      isManager,
      mutateUpdate,
      objQuery,
      setChangeRequestBusy,
      setChangeRequestObjectiveId,
    ],
  );

  const handleTransitionStatus = (id: string, targetStatus: MboStatus, reason?: string) => {
    const target = objectives.find((o) => o.id === id);
    if (!target) return;

    const transition = canTransitionMboStatus(target.status, targetStatus, {
      isManager,
      rejectionReason: reason,
    });
    if (!transition.allowed) {
      showToast(
        transition.reason ||
          MBO_COPY.transitionBlocked(statusLabelKo(target.status), statusLabelKo(targetStatus)),
        'warning',
      );
      return;
    }

    if (!orgId) {
      showToast(MBO_COPY.noOrgContextShort, 'error');
      return;
    }
    mutateUpdate(
      {
        resource: 'mbo_objectives',
        id,
        values: {
          status: targetStatus,
          rejection_reason: targetStatus === 'rejected' ? reason : null,
        },
      },
      {
        onSuccess: () => {
          void objQuery?.refetch?.();
          showToast(MBO_COPY.statusChanged(statusLabelKo(targetStatus)), 'success');
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : MBO_COPY.statusChangeFailed, 'error');
        },
      }
    );
  };

  const handleCreateObjective = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (!orgId) {
      showToast(MBO_COPY.noOrgContext, 'error');
      return;
    }
    if (goalsLocked && !canManagerCreateWhileLocked) {
      showToast(MBO_COPY.lockBlockCreate, 'warning');
      return;
    }
    if (!selectedOwnerMember?.userId) {
      showToast(MBO_COPY.pickOwnerMember, 'warning');
      return;
    }
    if (newVisibility === 'PARTIAL' && newShareMemberIds.length === 0) {
      showToast(MBO_COPY.pickShareMembers, 'warning');
      return;
    }

    const parentId = newLevel === 'company' ? null : newParentId || null;
    const departmentId = selectedOwnerMember.departmentId || newDepartmentId || null;
    const departmentName =
      selectedOwnerMember.departmentName?.trim() ||
      (departmentId ? orgDepartments.find((d) => d.id === departmentId)?.name : null) ||
      newDept.trim() ||
      '부서';

    const gate = validateGoalCreation({
      actor: goalActor,
      request: {
        level: newLevel,
        parentId,
        departmentId,
        departmentName,
      },
      existing: existingGoalRefs,
    });
    if (!gate.allowed) {
      showToast(gate.reason ?? MBO_COPY.createGoalBlocked, 'warning');
      return;
    }

    const ownerName = selectedOwnerMember.displayName;
    const ownerUserId = selectedOwnerMember.userId;

    mutateCreate(
      {
        resource: 'mbo_objectives',
        values: {
          organization_id: orgId,
          parent_id: parentId,
          level: newLevel,
          department_name: departmentName,
          owner_id: ownerUserId,
          owner_name: ownerName,
          title: newTitle.trim(),
          success_criteria: newCriteria.trim(),
          start_date: newStartDate,
          target_date: newTargetDate,
          weight: newWeight,
          progress_rate: 0,
          status: 'draft',
          target_value: newWeight,
          visibility_type: newVisibility,
        },
      },
      {
        onSuccess: async (result) => {
          const createdId = (result as { data?: { id?: string } })?.data?.id;
          try {
            if (createdId) {
              if (newVisibility === 'PARTIAL') {
                await MboService.replaceGoalShares(orgId, createdId, newShareMemberIds);
              }
              const project = await MboService.ensureDefaultProject(orgId, {
                id: createdId,
                title: newTitle.trim(),
                owner_id: ownerUserId,
                owner_name: ownerName,
                start_date: newStartDate,
                target_date: newTargetDate,
              });
              setSelectedObjectiveId(createdId);
              setSelectedProjectId(project.id);
              const shares = await MboService.listObjectiveSharesByOrg(orgId).catch(
                () => new Map<string, string[]>()
              );
              setSharesByObjective(shares);
            }
          } catch {
            showToast(MBO_COPY.createGoalProjectWarn, 'warning');
          }
          void objQuery?.refetch?.();
          void projectQuery?.refetch?.();
          setShowCreateModal(false);
          setNewTitle('');
          setNewShareMemberIds([]);
          setNewVisibility('PRIVATE');
          setNewParentId('');
          setNewDepartmentId('');
          showToast(MBO_COPY.createGoalSuccess, 'success');
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : MBO_COPY.createGoalFailed, 'error');
        },
      }
    );
  };

  const handleChangeVisibility = useCallback(
    async (objectiveId: string, visibility: MboVisibilityType) => {
      if (!orgId) return;
      if (visibility === 'PARTIAL') {
        setSharePickerObjectiveId(objectiveId);
        setNewShareMemberIds(sharesByObjective.get(objectiveId) ?? []);
        setSharePickerOpen(true);
        return;
      }
      try {
        await MboService.updateGoalVisibility(orgId, objectiveId, visibility, []);
        const shares = await MboService.listObjectiveSharesByOrg(orgId);
        setSharesByObjective(shares);
        void objQuery?.refetch?.();
        showToast(MBO_COPY.visibilityChanged, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : MBO_COPY.visibilityChangeFailed, 'error');
      }
    },
    [
      orgId,
      sharesByObjective,
      objQuery,
      setSharePickerObjectiveId,
      setNewShareMemberIds,
      setSharePickerOpen,
      setSharesByObjective,
    ]
  );

  const handleConfirmSoftDelete = () => {
    if (!deleteGoalId || !deleteReason.trim()) {
      showToast(MBO_COPY.deleteReasonRequired, 'warning');
      return;
    }
    void MboService.softDeleteObjective(deleteGoalId, deleteReason.trim())
      .then(() => {
        showToast(MBO_COPY.deleteSuccess, 'success');
        setDeleteGoalId(null);
        setDeleteReason('');
        void objQuery?.refetch?.();
        void projectQuery?.refetch?.();
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : MBO_COPY.deleteFailed, 'error');
      });
  };

  return {
    openCreateObjectiveModal,
    handleManagerRiskFilter,
    handleManagerCheckinFilter,
    handleEnsureProjectForObjective,
    handleProjectScheduleChange,
    submitGoalChangeRequest,
    handleTransitionStatus,
    handleCreateObjective,
    handleChangeVisibility,
    handleConfirmSoftDelete,
  };
}
