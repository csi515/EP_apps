/**
 * 연구과제(research_project) 순수 도메인 엔진
 *
 * MBO(평가·가중치)와 분리된 연구과제 생명주기:
 * - 담당(lead) / 부담당(co_lead) / 멤버
 * - 연구 예산(계획·집행·잔액)
 * - 산출물
 * - 1~n차 게이트 승인 (이전 차수 승인 후에만 다음 승인)
 */

export type ResearchProjectStatus =
  | 'draft'
  | 'active'
  | 'gate_review'
  | 'completed'
  | 'suspended'
  | 'canceled';

export type ResearchMemberRole = 'lead' | 'co_lead' | 'member';

export type DeliverableStatus = 'planned' | 'submitted' | 'accepted' | 'rejected';

export type GateStatus = 'pending' | 'in_approval' | 'approved' | 'rejected' | 'skipped';

export const RESEARCH_STATUS_LABELS: Record<ResearchProjectStatus, string> = {
  draft: '초안',
  active: '진행중',
  gate_review: '게이트 심의',
  completed: '완료',
  suspended: '보류',
  canceled: '중단',
};

export const GATE_STATUS_LABELS: Record<GateStatus, string> = {
  pending: '대기',
  in_approval: '결재 중',
  approved: '승인',
  rejected: '반려',
  skipped: '생략',
};

/** 칸반 컬럼(기획→개발→시험→완료) — 기존 status 매핑 */
export const RESEARCH_KANBAN_COLUMNS: Array<{
  id: string;
  label: string;
  statuses: ResearchProjectStatus[];
}> = [
  { id: 'planning', label: '기획', statuses: ['draft'] },
  { id: 'development', label: '개발', statuses: ['active', 'suspended'] },
  { id: 'testing', label: '시험', statuses: ['gate_review'] },
  { id: 'done', label: '완료', statuses: ['completed', 'canceled'] },
];

export type MemberProjectLoad = {
  /** organization user/member id — 있으면 이름 오타와 무관하게 집계 */
  memberId: string | null;
  memberName: string;
  projectCount: number;
};

/** 연구원별 참여 과제 수(간단 부하). memberId 우선, 없으면 이름 키. */
export function buildMemberProjectLoad(
  projects: Array<{ members: ResearchMember[] }>
): MemberProjectLoad[] {
  const map = new Map<string, MemberProjectLoad>();
  for (const p of projects) {
    for (const m of p.members) {
      const name = m.memberName.trim() || '미배정';
      const id = m.memberId?.trim() || null;
      const key = id ? `id:${id}` : `name:${name}`;
      const prev = map.get(key);
      if (prev) {
        prev.projectCount += 1;
        if (!prev.memberName || prev.memberName === '미배정') prev.memberName = name;
      } else {
        map.set(key, { memberId: id, memberName: name, projectCount: 1 });
      }
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      b.projectCount - a.projectCount || a.memberName.localeCompare(b.memberName, 'ko')
  );
}

export const MEMBER_ROLE_LABELS: Record<ResearchMemberRole, string> = {
  lead: '연구 책임자 (PI/연구담당)',
  co_lead: '부책임자 (랩장/부담당)',
  member: '참여연구원 (대학원생/팀원)',
};

/** 학술 및 R&D 산출물 세부 분류 */
export type DeliverableType =
  | 'paper'      // 학술 논문 (SCI/KCI 등)
  | 'conference' // 학회 발표 (구두/포스터)
  | 'thesis'     // 학위 논문 (석사/박사)
  | 'report'     // 연구 보고서 (연차/최종)
  | 'patent'     // 특허 출원/등록
  | 'code'       // 소스코드/데이터셋
  | 'other';     // 기타

export const DELIVERABLE_TYPE_LABELS: Record<DeliverableType, string> = {
  paper: '학술논문',
  conference: '학회발표',
  thesis: '학위논문',
  report: '연구보고서',
  patent: '특허',
  code: '코드/데이터',
  other: '기타',
};

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  planned: '계획',
  submitted: '제출/투고',
  accepted: '게재/승인',
  rejected: '반려/거절',
};

/** 산출물 제목에 유형 태그 결합 */
export function formatDeliverableTitle(type: DeliverableType, rawTitle: string): string {
  const clean = rawTitle.replace(/^\[(논문|학술논문|학회|학회발표|학위논문|디펜스|보고서|연구보고서|특허|코드|데이터|코드\/데이터|기타)\]\s*/i, '').trim();
  const label = DELIVERABLE_TYPE_LABELS[type] || '기타';
  return '[' + label + '] ' + (clean || rawTitle.trim());
}

/** 산출물 제목에서 유형 태그와 실제 제목 분리 파싱 */
export function parseDeliverableType(title: string): { type: DeliverableType; cleanTitle: string } {
  const trimmed = title.trim();
  const match = trimmed.match(/^\[(.*?)\]\s*(.*)$/);
  if (!match) {
    return { type: 'other', cleanTitle: trimmed };
  }
  const tag = match[1].trim().toLowerCase();
  const cleanTitle = match[2].trim();
  if (tag === '학술논문' || tag === '논문' || tag === 'paper') return { type: 'paper', cleanTitle };
  if (tag === '학회발표' || tag === '학회' || tag === 'conference') return { type: 'conference', cleanTitle };
  if (tag === '학위논문' || tag === '디펜스' || tag === 'thesis') return { type: 'thesis', cleanTitle };
  if (tag === '연구보고서' || tag === '보고서' || tag === 'report') return { type: 'report', cleanTitle };
  if (tag === '특허' || tag === 'patent') return { type: 'patent', cleanTitle };
  if (tag === '코드/데이터' || tag === '코드' || tag === '데이터' || tag === 'code') return { type: 'code', cleanTitle };
  return { type: 'other', cleanTitle };
}

export interface ResearchMember {
  memberId: string;
  memberName: string;
  role: ResearchMemberRole;
}

export interface ResearchDeliverable {
  id: string;
  title: string;
  dueDate?: string | null;
  status: DeliverableStatus;
  evidenceUrl?: string | null;
  sortOrder: number;
}

/** 과제 공통 관련 자료(외부 링크) */
export interface ResearchProjectLink {
  id: string;
  title: string;
  url: string;
  sortOrder: number;
}

export interface ResearchGate {
  id: string;
  gateOrder: number;
  title: string;
  criteria?: string | null;
  status: GateStatus;
  approvalRequestId?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
}

export interface ResearchBudget {
  planned: number;
  spent: number;
}

export interface ResearchProject {
  id: string;
  organizationId: string;
  code?: string | null;
  title: string;
  summary?: string | null;
  status: ResearchProjectStatus;
  categoryId?: string | null;
  startDate: string;
  endDate: string;
  budget: ResearchBudget;
  progressRate: number;
  members: ResearchMember[];
  deliverables: ResearchDeliverable[];
  gates: ResearchGate[];
  links: ResearchProjectLink[];
}

export function validateResearchPeriod(startDate: string, endDate: string): {
  isValid: boolean;
  errorMessage?: string;
} {
  if (!startDate || !endDate) {
    return { isValid: false, errorMessage: '시작일과 종료일은 필수입니다.' };
  }
  if (endDate < startDate) {
    return { isValid: false, errorMessage: '종료일은 시작일 이후여야 합니다.' };
  }
  return { isValid: true };
}

/**
 * 담당자 1명 필수, 부담당/멤버는 선택
 */
export function validateResearchMembers(members: ResearchMember[]): {
  isValid: boolean;
  leadCount: number;
  errorMessage?: string;
} {
  if (!members || members.length === 0) {
    return { isValid: false, leadCount: 0, errorMessage: '연구 담당자(lead)를 1명 지정해야 합니다.' };
  }
  const leadCount = members.filter((m) => m.role === 'lead').length;
  if (leadCount !== 1) {
    return {
      isValid: false,
      leadCount,
      errorMessage: `연구 담당자는 정확히 1명이어야 합니다. (현재 ${leadCount}명)`,
    };
  }
  const blank = members.find((m) => !m.memberName || !m.memberName.trim());
  if (blank) {
    return { isValid: false, leadCount, errorMessage: '구성원 이름은 비울 수 없습니다.' };
  }
  return { isValid: true, leadCount: 1 };
}

export function calculateBudgetRemaining(budget: ResearchBudget): number {
  return Number((Math.max(0, (budget.planned || 0) - (budget.spent || 0))).toFixed(2));
}

export function validateBudget(budget: ResearchBudget): {
  isValid: boolean;
  remaining: number;
  errorMessage?: string;
} {
  const planned = Number(budget.planned) || 0;
  const spent = Number(budget.spent) || 0;
  if (planned < 0 || spent < 0) {
    return { isValid: false, remaining: 0, errorMessage: '예산 금액은 0 이상이어야 합니다.' };
  }
  if (spent > planned) {
    return {
      isValid: false,
      remaining: calculateBudgetRemaining(budget),
      errorMessage: `집행액(${spent})이 계획 예산(${planned})을 초과할 수 없습니다.`,
    };
  }
  return { isValid: true, remaining: calculateBudgetRemaining({ planned, spent }) };
}

export function recordBudgetSpend(
  project: ResearchProject,
  amount: number,
  options?: { allowOverspend?: boolean }
): { project: ResearchProject; error?: string } {
  if (amount <= 0) {
    return { project, error: '집행 금액은 0보다 커야 합니다.' };
  }
  const nextSpent = Number(((project.budget.spent || 0) + amount).toFixed(2));
  const nextBudget = { planned: project.budget.planned, spent: nextSpent };
  if (!options?.allowOverspend) {
    const validation = validateBudget(nextBudget);
    if (!validation.isValid) {
      return { project, error: validation.errorMessage };
    }
  } else if (nextSpent < 0 || project.budget.planned < 0) {
    return { project, error: '예산 금액은 0 이상이어야 합니다.' };
  }
  return {
    project: {
      ...project,
      budget: nextBudget,
    },
  };
}

/**
 * 게이트 차수는 1부터 연속이어야 함
 */
export function validateGateSequence(gates: ResearchGate[]): {
  isValid: boolean;
  errorMessage?: string;
} {
  if (!gates || gates.length === 0) {
    return { isValid: false, errorMessage: '최소 1개 이상의 게이트가 필요합니다.' };
  }
  const sorted = [...gates].sort((a, b) => a.gateOrder - b.gateOrder);
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i].gateOrder !== i + 1) {
      return {
        isValid: false,
        errorMessage: `게이트 차수는 1부터 연속이어야 합니다. (기대 ${i + 1}, 실제 ${sorted[i].gateOrder})`,
      };
    }
  }
  return { isValid: true };
}

export function getCurrentGate(gates: ResearchGate[]): ResearchGate | null {
  const sorted = [...gates].sort((a, b) => a.gateOrder - b.gateOrder);
  return (
    sorted.find(
      (g) =>
        g.status === 'pending' || g.status === 'in_approval' || g.status === 'rejected'
    ) ?? null
  );
}

/** 로컬 직접 승인(결재 미연동) 가능 여부 */
export function canDirectDecideGate(gate: ResearchGate): boolean {
  return gate.status === 'pending' && !gate.approvalRequestId;
}

/** 반려된 게이트를 재심의 가능하도록 되돌릴 수 있는지 */
export function canReopenRejectedGate(gate: ResearchGate): boolean {
  return gate.status === 'rejected';
}

/**
 * 반려 게이트를 pending으로 재오픈.
 * 결재 연결·심의 이력을 초기화해 직접 승인 또는 재상신할 수 있게 한다.
 */
export function reopenRejectedGate(
  project: ResearchProject,
  gateOrder: number
): { project: ResearchProject; error?: string } {
  const target = project.gates.find((g) => g.gateOrder === gateOrder);
  if (!target) {
    return { project, error: `${gateOrder}차 게이트를 찾을 수 없습니다.` };
  }
  if (!canReopenRejectedGate(target)) {
    return { project, error: '반려된 게이트만 재오픈할 수 있습니다.' };
  }
  const guard = canDecideGate(project.gates, gateOrder);
  if (!guard.allowed) {
    return { project, error: guard.reason };
  }

  const gates = project.gates.map((g) =>
    g.gateOrder === gateOrder
      ? {
          ...g,
          status: 'pending' as GateStatus,
          approvalRequestId: null,
          decidedByName: null,
          decidedAt: null,
          decisionNote: null,
        }
      : g
  );

  return {
    project: {
      ...project,
      gates,
      status: 'gate_review',
    },
  };
}

/** 초안(draft) 과제를 진행중(active)으로 전환 */
export function activateDraftProject(
  project: ResearchProject
): { project: ResearchProject; error?: string } {
  if (project.status !== 'draft') {
    return { project, error: '초안 상태의 과제만 진행으로 전환할 수 있습니다.' };
  }
  return {
    project: {
      ...project,
      status: 'active',
    },
  };
}

const EDITABLE_META_STATUSES: ResearchProjectStatus[] = [
  'draft',
  'active',
  'gate_review',
  'suspended',
];

/** 과제 메타(제목·기간·예산·요약) 수정 */
export function updateResearchProjectMeta(
  project: ResearchProject,
  patch: {
    title?: string;
    summary?: string | null;
    startDate?: string;
    endDate?: string;
    budgetPlanned?: number;
  }
): { project: ResearchProject; error?: string } {
  if (!EDITABLE_META_STATUSES.includes(project.status)) {
    return { project, error: '완료·중단된 과제는 수정할 수 없습니다.' };
  }
  const title = patch.title !== undefined ? patch.title.trim() : project.title;
  if (title.length < 2) {
    return { project, error: '과제명은 2자 이상 필수입니다.' };
  }
  const startDate = patch.startDate ?? project.startDate;
  const endDate = patch.endDate ?? project.endDate;
  const period = validateResearchPeriod(startDate, endDate);
  if (!period.isValid) {
    return { project, error: period.errorMessage };
  }
  const planned =
    patch.budgetPlanned !== undefined ? Number(patch.budgetPlanned) || 0 : project.budget.planned;
  const budget = validateBudget({ planned, spent: project.budget.spent });
  if (!budget.isValid) {
    return { project, error: budget.errorMessage };
  }
  return {
    project: {
      ...project,
      title,
      summary:
        patch.summary !== undefined
          ? patch.summary?.trim() || null
          : project.summary,
      startDate,
      endDate,
      budget: { planned, spent: project.budget.spent },
    },
  };
}

/** 보류·중단·재개 */
export function setResearchProjectLifecycleStatus(
  project: ResearchProject,
  status: 'suspended' | 'canceled' | 'active'
): { project: ResearchProject; error?: string } {
  if (status === 'active') {
    if (project.status !== 'suspended' && project.status !== 'draft') {
      return { project, error: '보류·초안 과제만 진행으로 전환할 수 있습니다.' };
    }
    return { project: { ...project, status: 'active' } };
  }
  if (status === 'suspended') {
    if (project.status !== 'active' && project.status !== 'gate_review') {
      return { project, error: '진행·심의 중 과제만 보류할 수 있습니다.' };
    }
    return { project: { ...project, status: 'suspended' } };
  }
  if (project.status === 'completed' || project.status === 'canceled') {
    return { project, error: '이미 종료된 과제입니다.' };
  }
  return { project: { ...project, status: 'canceled' } };
}

/** 기본 게이트 제목 N개 생성 */
export function buildDefaultGateTitles(count: number): string[] {
  const n = Math.min(10, Math.max(1, Math.floor(count) || 3));
  return Array.from({ length: n }, (_, idx) => `${idx + 1}차 게이트`);
}

/** 관련 자료·산출물 증거 URL: http(s)만 허용 */
export function validateHttpUrl(url: string): { isValid: boolean; errorMessage?: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { isValid: false, errorMessage: 'URL을 입력해 주세요.' };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, errorMessage: 'http:// 또는 https:// URL만 사용할 수 있습니다.' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, errorMessage: '올바른 URL 형식이 아닙니다.' };
  }
}

export function canDecideGate(gates: ResearchGate[], gateOrder: number): {
  allowed: boolean;
  reason?: string;
} {
  const sorted = [...gates].sort((a, b) => a.gateOrder - b.gateOrder);
  const target = sorted.find((g) => g.gateOrder === gateOrder);
  if (!target) {
    return { allowed: false, reason: `${gateOrder}차 게이트를 찾을 수 없습니다.` };
  }
  for (const g of sorted) {
    if (g.gateOrder >= gateOrder) break;
    if (g.status !== 'approved' && g.status !== 'skipped') {
      return {
        allowed: false,
        reason: `${g.gateOrder}차 게이트가 승인되지 않아 ${gateOrder}차 심의를 진행할 수 없습니다.`,
      };
    }
  }
  return { allowed: true };
}

export function decideGate(
  project: ResearchProject,
  gateOrder: number,
  decision: {
    status: 'approved' | 'rejected' | 'skipped';
    decidedByName: string;
    decisionNote?: string;
    decidedAt?: string;
  },
  options?: { fromApprovalSync?: boolean }
): { project: ResearchProject; error?: string } {
  const seq = validateGateSequence(project.gates);
  if (!seq.isValid) {
    return { project, error: seq.errorMessage };
  }
  const guard = canDecideGate(project.gates, gateOrder);
  if (!guard.allowed) {
    return { project, error: guard.reason };
  }

  const targetGate = project.gates.find((g) => g.gateOrder === gateOrder);
  if (
    !options?.fromApprovalSync &&
    targetGate &&
    !canDirectDecideGate(targetGate) &&
    decision.status !== 'skipped'
  ) {
    return {
      project,
      error: '전자결재가 진행 중인 게이트는 결재함에서 승인·반려 후 동기화해야 합니다.',
    };
  }

  const decidedAt = decision.decidedAt || new Date().toISOString();
  const gates = project.gates.map((g) =>
    g.gateOrder === gateOrder
      ? {
          ...g,
          status: decision.status,
          approvalRequestId:
            decision.status === 'approved' || decision.status === 'rejected'
              ? g.approvalRequestId
              : g.approvalRequestId,
          decidedByName: decision.decidedByName,
          decidedAt,
          decisionNote: decision.decisionNote?.trim() || null,
        }
      : g
  );

  const allDone = gates.every((g) => g.status === 'approved' || g.status === 'skipped');
  const anyRejected = gates.some((g) => g.status === 'rejected');

  let status: ResearchProjectStatus = project.status;
  if (allDone) {
    status = 'completed';
  } else if (anyRejected || decision.status === 'approved' || decision.status === 'skipped') {
    status = 'gate_review';
  }

  const approvedCount = gates.filter((g) => g.status === 'approved' || g.status === 'skipped').length;
  const progressRate = Math.min(100, Math.round((approvedCount / gates.length) * 100));

  return {
    project: {
      ...project,
      gates,
      status,
      progressRate: allDone ? 100 : progressRate,
    },
  };
}

export function createResearchProject(params: {
  organizationId: string;
  title: string;
  summary?: string;
  code?: string;
  categoryId?: string | null;
  startDate: string;
  endDate: string;
  budgetPlanned: number;
  members: ResearchMember[];
  deliverables?: Array<{ title: string; dueDate?: string | null }>;
  gateTitles?: string[];
}): { project: ResearchProject | null; error?: string } {
  if (!params.title || params.title.trim().length < 2) {
    return { project: null, error: '과제명은 2자 이상 필수입니다.' };
  }
  const period = validateResearchPeriod(params.startDate, params.endDate);
  if (!period.isValid) {
    return { project: null, error: period.errorMessage };
  }
  const members = validateResearchMembers(params.members);
  if (!members.isValid) {
    return { project: null, error: members.errorMessage };
  }
  const budget = validateBudget({ planned: params.budgetPlanned, spent: 0 });
  if (!budget.isValid) {
    return { project: null, error: budget.errorMessage };
  }

  const gateTitles =
    params.gateTitles && params.gateTitles.length > 0
      ? params.gateTitles
      : ['1차 기획 게이트', '2차 중간 게이트', '3차 완료 게이트'];

  const gates: ResearchGate[] = gateTitles.map((title, idx) => ({
    id: `gate-${Date.now()}-${idx + 1}`,
    gateOrder: idx + 1,
    title: title.trim() || `${idx + 1}차 게이트`,
    criteria: null,
    status: 'pending' as GateStatus,
  }));

  const deliverables: ResearchDeliverable[] = (params.deliverables || []).map((d, idx) => ({
    id: `del-${Date.now()}-${idx + 1}`,
    title: d.title.trim(),
    dueDate: d.dueDate ?? null,
    status: 'planned' as DeliverableStatus,
    sortOrder: (idx + 1) * 10,
  }));

  const project: ResearchProject = {
    id: `rp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    organizationId: params.organizationId,
    code: params.code?.trim() || null,
    title: params.title.trim(),
    summary: params.summary?.trim() || null,
    status: 'draft',
    categoryId: params.categoryId ?? null,
    startDate: params.startDate,
    endDate: params.endDate,
    budget: { planned: params.budgetPlanned, spent: 0 },
    progressRate: 0,
    members: params.members.map((m) => ({
      ...m,
      memberName: m.memberName.trim(),
    })),
    deliverables,
    gates,
    links: [],
  };

  return { project };
}

/** 결재 상신 시 게이트를 in_approval로 전환 */
export function markGateSubmittedForApproval(
  project: ResearchProject,
  gateId: string,
  approvalRequestId: string
): { project: ResearchProject; error?: string } {
  const gate = project.gates.find((g) => g.id === gateId);
  if (!gate) return { project, error: '게이트를 찾을 수 없습니다.' };
  const guard = canDecideGate(project.gates, gate.gateOrder);
  if (!guard.allowed) return { project, error: guard.reason };
  if (!canDirectDecideGate(gate)) {
    return { project, error: '이 게이트는 결재 상신할 수 없습니다.' };
  }

  const gates = project.gates.map((g) =>
    g.id === gateId
      ? { ...g, status: 'in_approval' as GateStatus, approvalRequestId }
      : g
  );

  return {
    project: {
      ...project,
      gates,
      status: 'gate_review',
    },
  };
}

export function projectRowPatchFromDomain(project: ResearchProject): {
  title: string;
  summary: string | null;
  status: ResearchProjectStatus;
  start_date: string;
  end_date: string;
  progress_rate: number;
  budget_planned: number;
  budget_spent: number;
} {
  return {
    title: project.title,
    summary: project.summary ?? null,
    status: project.status,
    start_date: project.startDate,
    end_date: project.endDate,
    progress_rate: project.progressRate,
    budget_planned: project.budget.planned,
    budget_spent: project.budget.spent,
  };
}

export function updateDeliverableStatus(
  project: ResearchProject,
  deliverableId: string,
  status: DeliverableStatus
): ResearchProject {
  return {
    ...project,
    deliverables: project.deliverables.map((d) =>
      d.id === deliverableId ? { ...d, status } : d
    ),
  };
}

export function getLeadName(project: ResearchProject): string {
  return project.members.find((m) => m.role === 'lead')?.memberName || '미배정';
}

export function getCoLeadNames(project: ResearchProject): string[] {
  return project.members.filter((m) => m.role === 'co_lead').map((m) => m.memberName);
}
