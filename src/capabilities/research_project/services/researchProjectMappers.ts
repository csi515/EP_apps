import type { Database } from '@/lib/supabase/database.types';
import type {
  ResearchDeliverable,
  ResearchGate,
  ResearchMember,
  ResearchProject,
} from '../domain/researchProjectEngine';

type ProjectRow = Database['core']['Tables']['research_projects']['Row'];
type MemberRow = Database['core']['Tables']['research_project_members']['Row'];
type GateRow = Database['core']['Tables']['research_project_gates']['Row'];
type DeliverableRow = Database['core']['Tables']['research_project_deliverables']['Row'];

export function mapMemberRow(row: MemberRow): ResearchMember {
  return {
    memberId: row.member_id ?? row.id,
    memberName: row.member_name,
    role: row.role,
  };
}

export function mapGateRow(row: GateRow): ResearchGate {
  return {
    id: row.id,
    gateOrder: row.gate_order,
    title: row.title,
    criteria: row.criteria,
    status: row.status,
    approvalRequestId: row.approval_request_id ?? null,
    decidedByName: row.decided_by_name,
    decidedAt: row.decided_at,
    decisionNote: row.decision_note,
  };
}

export function mapDeliverableRow(row: DeliverableRow): ResearchDeliverable {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    status: row.status,
    evidenceUrl: row.evidence_url,
    sortOrder: row.sort_order,
  };
}

export function assembleResearchProject(
  row: ProjectRow,
  members: MemberRow[],
  gates: GateRow[],
  deliverables: DeliverableRow[]
): ResearchProject {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    title: row.title,
    summary: row.summary,
    status: row.status,
    categoryId: row.category_id,
    startDate: row.start_date,
    endDate: row.end_date,
    budget: {
      planned: Number(row.budget_planned) || 0,
      spent: Number(row.budget_spent) || 0,
    },
    progressRate: row.progress_rate,
    members: members.map(mapMemberRow),
    gates: gates.map(mapGateRow).sort((a, b) => a.gateOrder - b.gateOrder),
    deliverables: deliverables
      .map(mapDeliverableRow)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function projectInsertFromDomain(
  project: ResearchProject
): Database['core']['Tables']['research_projects']['Insert'] {
  return {
    id: project.id,
    organization_id: project.organizationId,
    code: project.code,
    title: project.title,
    summary: project.summary,
    status: project.status,
    category_id: project.categoryId,
    start_date: project.startDate,
    end_date: project.endDate,
    budget_planned: project.budget.planned,
    budget_spent: project.budget.spent,
    progress_rate: project.progressRate,
  };
}

export function memberInsertFromDomain(
  organizationId: string,
  projectId: string,
  member: ResearchMember
): Database['core']['Tables']['research_project_members']['Insert'] {
  return {
    organization_id: organizationId,
    project_id: projectId,
    member_id: member.memberId.startsWith('local-') ? null : member.memberId,
    member_name: member.memberName,
    role: member.role,
  };
}

export function gateInsertFromDomain(
  organizationId: string,
  projectId: string,
  gate: ResearchGate
): Database['core']['Tables']['research_project_gates']['Insert'] {
  return {
    id: gate.id.startsWith('gate-') ? undefined : gate.id,
    organization_id: organizationId,
    project_id: projectId,
    gate_order: gate.gateOrder,
    title: gate.title,
    criteria: gate.criteria,
    status: gate.status,
    approval_request_id: gate.approvalRequestId,
  };
}

export function deliverableInsertFromDomain(
  organizationId: string,
  projectId: string,
  item: ResearchDeliverable
): Database['core']['Tables']['research_project_deliverables']['Insert'] {
  return {
    id: item.id.startsWith('del-') ? undefined : item.id,
    organization_id: organizationId,
    project_id: projectId,
    title: item.title,
    due_date: item.dueDate,
    status: item.status,
    evidence_url: item.evidenceUrl,
    sort_order: item.sortOrder,
  };
}

export function gateUpdateFromDomain(
  gate: ResearchGate
): Database['core']['Tables']['research_project_gates']['Update'] {
  return {
    status: gate.status,
    approval_request_id: gate.approvalRequestId,
    decided_by_name: gate.decidedByName,
    decided_at: gate.decidedAt,
    decision_note: gate.decisionNote,
  };
}
