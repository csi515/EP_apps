import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  listDepartmentMembers,
  listDepartments,
  type OrgTreeNode,
} from '@/core/organizations/services/organizationTreeService';
import { userFacingErrorMessage } from '@/shared/errors/userFacingError';
import {
  countAssessmentsByDepartment,
  deriveDepartmentCode,
  filterAssessmentsByDepartment,
  type SopDepartmentFilter,
  type SopDepartmentOption,
} from '../domain/sopDepartmentFilter';
import {
  listApprovalLines,
  listOrgMembers,
  listRevisions,
  listRiskAssessments,
  createDraftRiskAssessment,
  reviseAssessment,
  saveDraftRiskAssessment,
  submitForReview,
  type ApprovalLineRow,
  type RevisionRow,
  type RiskAssessmentRow,
} from '../services/riskAssessmentApprovalService';
import {
  addStep,
  canEditRiskDraft,
  emptyDocumentBody,
  moveStep,
  moveStepByOffset,
  readDocumentBody,
  removeStep,
  updateStep,
  validateDraftForSubmit,
  type OrgMemberOption,
  type SopDocumentBody,
} from '../domain/sopStepDocument';
import type { StepHazardBlock } from '../domain/sopNumberingAndAuditEngine';

type Identity = { id?: string };

function toDeptOption(node: OrgTreeNode): SopDepartmentOption {
  return {
    id: node.id,
    name: node.name,
    code: node.code,
  };
}

export function useSopRiskWorkspace() {
  const { currentOrganization, currentRole, selectedMembership } = useOrganization();
  const { data: identity } = useGetIdentity<Identity>();
  const orgId = currentOrganization?.id ?? '';
  const userId = identity?.id ?? '';
  const memberId = selectedMembership?.id ?? null;

  const [docs, setDocs] = useState<RiskAssessmentRow[]>([]);
  const [departments, setDepartments] = useState<SopDepartmentOption[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<SopDepartmentFilter>('all');
  const [members, setMembers] = useState<OrgMemberOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewVersion, setViewVersion] = useState<number | 'live'>('live');
  const [body, setBody] = useState<SopDocumentBody>(emptyDocumentBody());
  const [dirty, setDirty] = useState(false);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [lines, setLines] = useState<ApprovalLineRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [readyId, setReadyId] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const loadedIdRef = useRef<string | null>(null);
  const filterReadyRef = useRef(false);
  dirtyRef.current = dirty;

  const filteredDocs = useMemo(
    () => filterAssessmentsByDepartment(docs, departments, departmentFilter),
    [docs, departments, departmentFilter]
  );

  const departmentCounts = useMemo(
    () => countAssessmentsByDepartment(docs, departments),
    [docs, departments]
  );

  const selected = docs.find((doc) => doc.id === selectedId) ?? null;

  const canEdit = Boolean(
    selected &&
      canEditRiskDraft({
        status: selected.status,
        createdBy: selected.created_by,
        userId,
        role: currentRole,
      })
  );
  const editable = canEdit && viewVersion === 'live';

  const displayedBody = useMemo(() => {
    if (viewVersion === 'live') return body;
    const revision = revisions.find((row) => row.version === viewVersion);
    return revision ? readDocumentBody(revision.snapshot_payload) : body;
  }, [body, revisions, viewVersion]);

  const reloadLists = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [nextDocs, nextMembers, nextDepts, deptMembers] = await Promise.all([
        listRiskAssessments(orgId),
        listOrgMembers(orgId),
        listDepartments(orgId),
        listDepartmentMembers(orgId).catch(() => []),
      ]);
      const deptOptions = nextDepts.map(toDeptOption);
      setDocs(nextDocs);
      setMembers(nextMembers);
      setDepartments(deptOptions);

      if (!filterReadyRef.current) {
        filterReadyRef.current = true;
        const myDept = memberId
          ? deptMembers.find((row) => row.member_id === memberId)?.department_id
          : null;
        if (myDept && deptOptions.some((d) => d.id === myDept)) {
          setDepartmentFilter(myDept);
        }
      }

      setSelectedId((current) => {
        if (current && nextDocs.some((doc) => doc.id === current)) return current;
        return nextDocs[0]?.id ?? null;
      });
    } catch (cause) {
      setError(userFacingErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [orgId, memberId]);

  useEffect(() => {
    void reloadLists();
  }, [reloadLists]);

  useEffect(() => {
    if (selectedId && filteredDocs.some((doc) => doc.id === selectedId)) return;
    setSelectedId(filteredDocs[0]?.id ?? null);
  }, [filteredDocs, selectedId]);

  useEffect(() => {
    if (!selectedId || !selected) return;
    let cancelled = false;
    if (loadedIdRef.current !== selectedId) setReadyId(null);
    void (async () => {
      try {
        const [nextLines, nextRevisions] = await Promise.all([
          listApprovalLines(selectedId),
          listRevisions(selectedId),
        ]);
        if (cancelled) return;
        setLines(nextLines);
        setRevisions(nextRevisions);
        if (loadedIdRef.current !== selectedId) {
          loadedIdRef.current = selectedId;
          setViewVersion('live');
        }
        if (!dirtyRef.current) setBody(readDocumentBody(selected.snapshot_payload));
        setReadyId(selectedId);
      } catch (cause) {
        if (!cancelled) setError(userFacingErrorMessage(cause));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, selected?.status, selected?.current_version, selected?.updated_at]);

  const patchBody = (next: SopDocumentBody) => {
    setBody(next);
    setDirty(true);
  };

  const persist = useCallback(async () => {
    if (!selected || !canEdit) return selected;
    const saved = await saveDraftRiskAssessment({
      assessmentId: selected.id,
      processName: selected.process_name,
      body,
    });
    setDocs((current) => current.map((doc) => (doc.id === saved.id ? saved : doc)));
    setBody(readDocumentBody(saved.snapshot_payload));
    setDirty(false);
    return saved;
  }, [body, canEdit, selected]);

  const selectDoc = async (id: string) => {
    if (id === selectedId) return;
    setBusy(true);
    setError(null);
    try {
      if (dirty && canEdit) await persist();
      setSelectedId(id);
    } catch (cause) {
      setError(userFacingErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const createDoc = async (input: {
    departmentId: string | null;
    deptCode: string;
    deptName: string;
    processName: string;
  }) => {
    if (!orgId) throw new Error('사업장을 선택해 주세요.');
    setBusy(true);
    setError(null);
    try {
      if (dirty && canEdit) await persist();
      const created = await createDraftRiskAssessment({
        organizationId: orgId,
        departmentId: input.departmentId,
        deptCode: input.deptCode,
        deptName: input.deptName,
        processName: input.processName,
        existingDocNos: docs.map((doc) => doc.document_no),
      });
      setDocs((current) => [created, ...current]);
      if (input.departmentId) setDepartmentFilter(input.departmentId);
      setSelectedId(created.id);
      setMessage('초안이 만들어졌습니다. 작업 단계를 입력한 뒤 검토를 요청하세요.');
    } catch (cause) {
      setError(userFacingErrorMessage(cause));
      throw cause;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await persist();
      setMessage('초안을 저장했습니다.');
    } catch (cause) {
      setError(userFacingErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!selected) return;
    const check = validateDraftForSubmit(body);
    if (!check.isValid) {
      setError(check.error ?? '검토 요청 전에 입력을 확인해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await persist();
      if (!saved) return;
      await submitForReview(saved.id, body.intendedReviewerId!);
      setMessage('검토 요청이 접수되었습니다.');
      await reloadLists();
      setSelectedId(saved.id);
    } catch (cause) {
      setError(userFacingErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const revise = async (reason: string, occasional: boolean) => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await reviseAssessment({
        assessmentId: selected.id,
        revisionType: occasional ? 'OCCASIONAL' : 'PERIODIC',
        revisionReason: reason,
      });
      setMessage('개정 초안이 열렸습니다. 단계를 수정한 뒤 다시 검토를 요청하세요.');
      await reloadLists();
      setSelectedId(selected.id);
    } catch (cause) {
      setError(userFacingErrorMessage(cause));
      throw cause;
    } finally {
      setBusy(false);
    }
  };

  return {
    docs,
    filteredDocs,
    departments,
    departmentFilter,
    setDepartmentFilter,
    departmentCounts,
    deriveDepartmentCode,
    members,
    selected,
    body: displayedBody,
    lines,
    revisions,
    viewVersion,
    setViewVersion,
    editable: editable && readyId === selectedId,
    loading,
    busy,
    error,
    message,
    dirty,
    userId,
    setSteps: (steps: StepHazardBlock[]) => patchBody({ ...body, steps }),
    addStep: () => patchBody({ ...body, steps: addStep(body.steps) }),
    removeStep: (id: string) => patchBody({ ...body, steps: removeStep(body.steps, id) }),
    moveStep: (from: number, to: number) => patchBody({ ...body, steps: moveStep(body.steps, from, to) }),
    moveStepByOffset: (id: string, offset: -1 | 1) =>
      patchBody({ ...body, steps: moveStepByOffset(body.steps, id, offset) }),
    updateStep: (id: string, patch: Partial<StepHazardBlock>) =>
      patchBody({ ...body, steps: updateStep(body.steps, id, patch) }),
    setProhibited: (prohibitedActions: string[]) => patchBody({ ...body, prohibitedActions }),
    setReviewer: (intendedReviewerId: string) => patchBody({ ...body, intendedReviewerId }),
    setApprover: (intendedApproverId: string) => patchBody({ ...body, intendedApproverId }),
    selectDoc,
    createDoc,
    save,
    submit,
    revise,
  };
}
