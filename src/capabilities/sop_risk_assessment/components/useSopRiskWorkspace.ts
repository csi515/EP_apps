import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
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

export function useSopRiskWorkspace() {
  const { currentOrganization, currentRole } = useOrganization();
  const { data: identity } = useGetIdentity<Identity>();
  const orgId = currentOrganization?.id ?? '';
  const userId = identity?.id ?? '';

  const [docs, setDocs] = useState<RiskAssessmentRow[]>([]);
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
  dirtyRef.current = dirty;

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
      const [nextDocs, nextMembers] = await Promise.all([
        listRiskAssessments(orgId),
        listOrgMembers(orgId),
      ]);
      setDocs(nextDocs);
      setMembers(nextMembers);
      setSelectedId((current) => current ?? nextDocs[0]?.id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '문서를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void reloadLists();
  }, [reloadLists]);

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
        if (!cancelled) setError(cause instanceof Error ? cause.message : '결재선 조회 실패');
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
      setError(cause instanceof Error ? cause.message : '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const createDoc = async (input: { deptCode: string; deptName: string; processName: string }) => {
    if (!orgId) throw new Error('사업장을 선택해 주세요.');
    setBusy(true);
    setError(null);
    try {
      if (dirty && canEdit) await persist();
      const created = await createDraftRiskAssessment({
        organizationId: orgId,
        deptCode: input.deptCode,
        deptName: input.deptName,
        processName: input.processName,
        existingDocNos: docs.map((doc) => doc.document_no),
      });
      setDocs((current) => [created, ...current]);
      setSelectedId(created.id);
      setMessage('초안이 만들어졌습니다. 작업 단계를 입력한 뒤 검토를 요청하세요.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '문서 생성 실패');
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
      setError(cause instanceof Error ? cause.message : '저장에 실패했습니다.');
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
      setError(cause instanceof Error ? cause.message : '검토 요청 실패');
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
      setError(cause instanceof Error ? cause.message : '개정 발의 실패');
      throw cause;
    } finally {
      setBusy(false);
    }
  };

  return {
    docs,
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
