/**
 * 작업표준 단계와 위험성평가를 한 문서 본문(snapshot_payload)으로 다룬다.
 * 초안만 추가·삭제·순서 변경이 되고, 승인 스냅샷은 읽기 전용이다.
 */
import { computeRiskScore, type StepHazardBlock } from './sopNumberingAndAuditEngine';

export const HAZARD_CATEGORIES = [
  '기계적',
  '전기적',
  '화학물질',
  '추락/전도',
  '화재/폭발',
  '근골격계',
  '소음/분진',
  '기타',
] as const;

export interface RejectionNote {
  id: string;
  stepOrder: number;
  stepLabel: string;
  reason: string;
  rejectedAt: string | null;
}

export interface SopDocumentBody {
  steps: StepHazardBlock[];
  prohibitedActions: string[];
  deptCode: string;
  deptName: string;
  intendedReviewerId: string | null;
  intendedApproverId: string | null;
  rejectionHistory: RejectionNote[];
}

export interface OrgMemberOption {
  userId: string;
  role: string;
  name: string;
  permissions: string[];
}

let stepSeq = 0;

export function createStepId(now = Date.now()): string {
  stepSeq += 1;
  return `step-${now}-${stepSeq}`;
}

export function emptyDocumentBody(): SopDocumentBody {
  return {
    steps: [],
    prohibitedActions: [],
    deptCode: 'GEN',
    deptName: '',
    intendedReviewerId: null,
    intendedApproverId: null,
    rejectionHistory: [],
  };
}

export function recomputeStep(step: StepHazardBlock): StepHazardBlock {
  const initial = computeRiskScore(step.initialFreq, step.initialSev);
  const residual = computeRiskScore(step.residualFreq, step.residualSev);
  return {
    ...step,
    actionTitle: step.actionTitle ?? '',
    hazardDesc: step.hazardDesc ?? '',
    hazardCategory: step.hazardCategory || '기계적',
    sopControlMeasure: step.sopControlMeasure ?? '',
    requiredPPE: (step.requiredPPE ?? []).map((item) => item.trim()).filter(Boolean),
    assignee: step.assignee ?? '',
    actionDeadline: step.actionDeadline ?? '',
    initialScore: initial.score,
    initialLevel: initial.level,
    residualScore: residual.score,
    residualLevel: residual.level,
    isImplemented: Boolean(step.isImplemented),
  };
}

export function renumberSteps(steps: readonly StepHazardBlock[]): StepHazardBlock[] {
  return steps.map((step, index) => recomputeStep({ ...step, stepNumber: index + 1 }));
}

export function createBlankStep(stepNumber: number): StepHazardBlock {
  return recomputeStep({
    id: createStepId(),
    stepNumber,
    actionTitle: '',
    hazardDesc: '',
    hazardCategory: '기계적',
    initialFreq: 3,
    initialSev: 3,
    initialScore: 9,
    initialLevel: 'medium',
    sopControlMeasure: '',
    requiredPPE: [],
    residualFreq: 1,
    residualSev: 2,
    residualScore: 2,
    residualLevel: 'low',
    assignee: '',
    actionDeadline: '',
    isImplemented: false,
  });
}

export function addStep(steps: readonly StepHazardBlock[]): StepHazardBlock[] {
  return renumberSteps([...steps, createBlankStep(steps.length + 1)]);
}

export function removeStep(steps: readonly StepHazardBlock[], id: string): StepHazardBlock[] {
  return renumberSteps(steps.filter((step) => step.id !== id));
}

export function moveStep(
  steps: readonly StepHazardBlock[],
  fromIndex: number,
  toIndex: number
): StepHazardBlock[] {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= steps.length || toIndex >= steps.length) {
    return renumberSteps([...steps]);
  }
  if (fromIndex === toIndex) return renumberSteps([...steps]);
  const next = [...steps];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return renumberSteps(next);
}

export function moveStepByOffset(
  steps: readonly StepHazardBlock[],
  id: string,
  offset: -1 | 1
): StepHazardBlock[] {
  const index = steps.findIndex((step) => step.id === id);
  if (index < 0) return renumberSteps([...steps]);
  return moveStep(steps, index, index + offset);
}

export function updateStep(
  steps: readonly StepHazardBlock[],
  id: string,
  patch: Partial<StepHazardBlock>
): StepHazardBlock[] {
  return steps.map((step) => {
    if (step.id !== id) return step;
    return recomputeStep({ ...step, ...patch, id: step.id, stepNumber: step.stepNumber });
  });
}

export function isDraftStatus(status: string): boolean {
  return status === 'DRAFT';
}

export function canEditRiskDraft(input: {
  status: string;
  createdBy: string;
  userId: string;
  role: string | null;
}): boolean {
  if (!isDraftStatus(input.status) || !input.userId) return false;
  if (input.createdBy === input.userId) return true;
  return input.role === 'owner' || input.role === 'admin';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function unwrapPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const nested = asRecord(raw.payload);
  if (!nested) return raw;
  if (
    Array.isArray(nested.steps) ||
    Array.isArray(nested.hazards) ||
    Array.isArray(nested.prohibitedActions)
  ) {
    return nested;
  }
  return raw;
}

function rejectionLabel(stepOrder: number): string {
  return stepOrder === 3 ? '최종 승인' : '검토';
}

function readRejectionHistory(body: Record<string, unknown>): RejectionNote[] {
  if (!Array.isArray(body.rejectionHistory)) return [];
  const notes: RejectionNote[] = [];
  body.rejectionHistory.forEach((item, index) => {
    const row = asRecord(item);
    if (!row) return;
    const reason = readString(row.reason).trim();
    if (!reason) return;
    const stepOrder = readNumber(row.stepOrder, 2);
    notes.push({
      id: readString(row.id, `reject-${index + 1}`),
      stepOrder,
      stepLabel: readString(row.stepLabel, rejectionLabel(stepOrder)),
      reason,
      rejectedAt: readString(row.rejectedAt) || null,
    });
  });
  return notes;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStep(value: unknown, index: number): StepHazardBlock | null {
  const row = asRecord(value);
  if (!row) return null;
  const ppe = Array.isArray(row.requiredPPE)
    ? row.requiredPPE.filter((item): item is string => typeof item === 'string')
    : [];
  return recomputeStep({
    id: readString(row.id, `step-import-${index + 1}`),
    stepNumber: readNumber(row.stepNumber, index + 1),
    actionTitle: readString(row.actionTitle),
    hazardDesc: readString(row.hazardDesc),
    hazardCategory: readString(row.hazardCategory, '기계적'),
    initialFreq: readNumber(row.initialFreq, 3),
    initialSev: readNumber(row.initialSev, 3),
    initialScore: 0,
    initialLevel: 'low',
    sopControlMeasure: readString(row.sopControlMeasure),
    requiredPPE: ppe,
    residualFreq: readNumber(row.residualFreq, 1),
    residualSev: readNumber(row.residualSev, 2),
    residualScore: 0,
    residualLevel: 'low',
    assignee: readString(row.assignee),
    actionDeadline: readString(row.actionDeadline),
    isImplemented: Boolean(row.isImplemented),
  });
}

export function readDocumentBody(payload: unknown): SopDocumentBody {
  const raw = asRecord(payload);
  if (!raw) return emptyDocumentBody();
  const body = unwrapPayload(raw);
  const steps = Array.isArray(body.steps)
    ? body.steps
        .map((step, index) => normalizeStep(step, index))
        .filter((step): step is StepHazardBlock => step !== null)
    : [];
  const prohibited = Array.isArray(body.prohibitedActions)
    ? body.prohibitedActions.filter((item): item is string => typeof item === 'string')
    : [];
  return {
    steps: renumberSteps(steps),
    prohibitedActions: prohibited,
    deptCode: readString(body.deptCode, 'GEN'),
    deptName: readString(body.deptName),
    intendedReviewerId: readString(body.intendedReviewerId) || null,
    intendedApproverId: readString(body.intendedApproverId) || null,
    rejectionHistory: readRejectionHistory(body),
  };
}

export function buildSnapshotPayload(body: SopDocumentBody): Record<string, unknown> {
  const steps = renumberSteps(body.steps);
  const prohibitedActions = body.prohibitedActions.map((item) => item.trim()).filter(Boolean);
  return {
    steps,
    hazards: steps.map((step) => ({
      hazardId: step.id,
      stepNumber: step.stepNumber,
      description: step.hazardDesc,
      score: step.initialScore,
      level: step.initialLevel,
    })),
    prohibitedActions,
    deptCode: body.deptCode.trim() || 'GEN',
    deptName: body.deptName.trim(),
    intendedReviewerId: body.intendedReviewerId,
    intendedApproverId: body.intendedApproverId,
    rejectionHistory: body.rejectionHistory,
  };
}

export function countHazardsInSnapshot(snapshot: Record<string, unknown>): number {
  const body = readDocumentBody(snapshot);
  if (body.steps.length > 0) return body.steps.length;
  const raw = unwrapPayload(snapshot);
  return Array.isArray(raw.hazards) ? raw.hazards.length : 0;
}

export function validateDraftForSubmit(body: SopDocumentBody): { isValid: boolean; error?: string } {
  if (body.steps.length === 0) {
    return { isValid: false, error: '작업 단계를 한 개 이상 추가해 주세요.' };
  }
  for (const step of body.steps) {
    if (!step.actionTitle.trim() || !step.hazardDesc.trim()) {
      return {
        isValid: false,
        error: `${step.stepNumber}단계의 작업 내용과 유해·위험요인을 입력해 주세요.`,
      };
    }
    if (!step.sopControlMeasure.trim()) {
      return { isValid: false, error: `${step.stepNumber}단계의 안전조치를 입력해 주세요.` };
    }
  }
  if (!body.intendedReviewerId) {
    return { isValid: false, error: '검토자를 선택해 주세요.' };
  }
  if (!body.intendedApproverId) {
    return { isValid: false, error: '최종 승인자를 선택해 주세요.' };
  }
  if (body.intendedReviewerId === body.intendedApproverId) {
    return { isValid: false, error: '검토자와 최종 승인자는 서로 다른 사람이어야 합니다.' };
  }
  return { isValid: true };
}
