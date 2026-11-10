import { useCallback, type FormEvent } from 'react';
import { canTransitionMboStatus, type MboStatus } from '../domain/mboEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import { MBO_COPY } from '../ui/mboUiCopy';
import { MboService } from '../services/mboService';
import { listEligibleParentGoals, resolveMaxCreatableLevel, validateGoalCreation } from '../domain/mboGoalHierarchy';
import type { MboVisibilityType } from '../domain/mboVisibilityEngine';
import type { ObjectiveNode } from '../ui/MboObjectiveTreeViewer';
import type { MboManagementWorkspaceState } from './useMboManagementWorkspaceState';
import type { MboManagementObjectivesDerived } from './useMboManagementObjectivesDerived';
import type { MboManagementDashboardDerived } from './useMboManagementDashboardDerived';


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
  const canOverrideGoalLockForOwner = dash.canOverrideGoalLockForOwner;
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
    setProjectSheetId,
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
    setLocalObjectives,
    isOrgAdmin,
    authUser,
    activeUser,
    showRejectModal,
    setShowRejectModal,
    setRejectionInput,
    setPlanApprovalObjectiveId,
    planApprovalObjectiveId,
    orgScope,
    logQuery,
  } = state;
  const openCreateObjectiveModal = useCallback(() => {
    const canCreateWhileLocked = isManager && (isOrgAdmin || orgScope?.isSubtreeManager === true);
    if (goalsLocked && !canCreateWhileLocked) {
      showToast('목표 잠금 기간에는 새 목표를 등록할 수 없습니다.', 'warning');
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
        showToast('실행 프로젝트가 생성되었습니다. 간트에서 일정을 조정하세요.', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '프로젝트 생성 실패', 'error');
      }
    },
    [orgId, projectQuery],
  );

  const handleProjectScheduleChange = useCallback(
    async (projectId: string, range: { startDate: string; targetDate: string }) => {
      if (!orgId) return;
      if (goalsLocked) {
        showToast('목표 잠금 기간에는 일정을 변경할 수 없습니다.', 'warning');
        return;
      }
      try {
        await MboService.updateProject(projectId, orgId, {
          start_date: range.startDate,
          target_date: range.targetDate,
        });
        void projectQuery?.refetch?.();
        showToast('프로젝트 일정이 저장되었습니다.', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '일정 저장 실패', 'error');
      }
    },
    [orgId, goalsLocked, projectQuery],
  );

  const submitGoalChangeRequest = useCallback(
    (reason: string) => {
      if (!changeRequestObjectiveId || !orgId) return;
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
            description: `${target.description || ''}\n\n[변경 요청] ${reason}`.trim(),
          },
        },
        {
          onSuccess: () => {
            void objQuery?.refetch?.();
            showToast('목표 변경 승인 요청이 접수되었습니다.', 'success');
            setChangeRequestObjectiveId(null);
          },
          onError: (err) => {
            showToast(err instanceof Error ? err.message : '요청 실패', 'error');
          },
          onSettled: () => setChangeRequestBusy(false),
        },
      );
    },
    [changeRequestObjectiveId, orgId, objectives, isManager, mutateUpdate, objQuery],
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
        transition.reason || `?꾩씠?????녿뒗 ?곹깭?낅땲?? ${target.status} -> ${targetStatus}`,
        'warning',
      );
      return;
    }

    if (!orgId) {
      showToast('議곗쭅 而⑦뀓?ㅽ듃媛 ?놁뒿?덈떎.', 'error');
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
          showToast(`紐⑺몴 ?곹깭媛 [${targetStatus}]濡?蹂寃쎈릺?덉뒿?덈떎.`, 'success');
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : '?곹깭 蹂寃??ㅽ뙣', 'error');
        },
      }
    );
  };

  // ?좉퇋 紐⑺몴 ?앹꽦 ????긽 DB + 湲곕낯 ?ㅽ뻾 ?꾨줈?앺듃 ?뺣낫
  const handleCreateObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (!orgId) {
      showToast('議곗쭅 而⑦뀓?ㅽ듃媛 ?놁뒿?덈떎. 濡쒓렇?맞룹“吏곸쓣 ?뺤씤?섏꽭??', 'error');
      return;
    }
    if (goalsLocked) {
      showToast('紐⑺몴 ?좉툑 湲곌컙?먮뒗 ??紐⑺몴瑜??깅줉?????놁뒿?덈떎.', 'warning');
      return;
    }
    if (!selectedOwnerMember?.userId) {
      showToast('?대떦?먮? 議곗쭅 硫ㅻ쾭?먯꽌 ?좏깮??二쇱꽭??', 'warning');
      return;
    }
    if (newVisibility === 'PARTIAL' && newShareMemberIds.length === 0) {
      showToast('?좏깮 怨듦컻????怨듭쑀 ??곸옄瑜?吏?뺥빐 二쇱꽭??', 'warning');
      return;
    }

    const parentId = newLevel === 'company' ? null : newParentId || null;
    const departmentId =
      selectedOwnerMember.departmentId || newDepartmentId || null;
    const departmentName =
      selectedOwnerMember.departmentName?.trim() ||
      (departmentId
        ? orgDepartments.find((d) => d.id === departmentId)?.name
        : null) ||
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
      showToast(gate.reason ?? '???④퀎??紐⑺몴瑜??깅줉?????놁뒿?덈떎.', 'warning');
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
            showToast('紐⑺몴????λ릱?쇰굹 ?ㅽ뻾 ?꾨줈?앺듃 ?먮룞 ?앹꽦???ㅽ뙣?덉뒿?덈떎.', 'warning');
          }
          void objQuery?.refetch?.();
          void projectQuery?.refetch?.();
          setShowCreateModal(false);
          setNewTitle('');
          setNewShareMemberIds([]);
          setNewVisibility('PRIVATE');
          setNewParentId('');
          setNewDepartmentId('');
          showToast('?좉퇋 MBO 怨쇱젣? ?ㅽ뻾 ?꾨줈?앺듃媛 ?깅줉?섏뿀?듬땲??', 'success');
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : '紐⑺몴 ?깅줉 ?ㅽ뙣', 'error');
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
        showToast('怨듦컻踰붿쐞媛 蹂寃쎈릺?덉뒿?덈떎.', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '怨듦컻踰붿쐞 蹂寃??ㅽ뙣', 'error');
      }
    },
    [orgId, sharesByObjective, objQuery]
  );

  const handleConfirmSoftDelete = () => {
    if (!deleteGoalId || !deleteReason.trim()) {
      showToast('??젣 ?ъ쑀瑜??낅젰??二쇱꽭??', 'warning');
      return;
    }
    void MboService.softDeleteObjective(deleteGoalId, deleteReason.trim())
      .then(() => {
        showToast('怨쇱젣媛 ??젣?섏뿀怨??대젰????λ릺?덉뒿?덈떎.', 'success');
        setDeleteGoalId(null);
        setDeleteReason('');
        void objQuery?.refetch?.();
        void projectQuery?.refetch?.();
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : '??젣 ?ㅽ뙣', 'error');
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
